const { PrismaClient } = require('@prisma/client')
const nodemailer = require('nodemailer')
const cron = require('node-cron')

const prisma = new PrismaClient()

// To track state so we don't send multiple concurrent runs
let isRunning = false

async function getSettings() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'REMINDER_TYPE', 'REMINDER_DAY', 'REMINDER_TIME', 'REMINDER_CUSTOM_DATE',
          'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
          'WARNING_HOURS', 'WARNING_MESSAGE_SUBJECT', 'WARNING_MESSAGE_CONTENT',
          'MISSED_MESSAGE_SUBJECT', 'MISSED_MESSAGE_CONTENT'
        ]
      }
    }
  })

  const config = {}
  for (const s of settings) {
    try {
      const parsed = JSON.parse(s.value)
      config[s.key] = parsed[0]
    } catch (e) {
      config[s.key] = s.value
    }
  }
  return config
}

async function sendEmail(config, to, subject, text) {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    console.error("Missing SMTP credentials in settings")
    return false
  }

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: parseInt(config.SMTP_PORT || '465'),
    secure: config.SMTP_SECURE === 'true',
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: config.SMTP_FROM || config.SMTP_USER,
      to,
      subject,
      text,
    })
    return true
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    return false
  }
}

function getNextWeeklyDeadline(dayOfWeekStr, timeStr) {
  // dayOfWeekStr: "1" = Monday, ... "0" = Sunday
  // timeStr: "15:00"
  const now = new Date()
  const targetDay = parseInt(dayOfWeekStr)
  let [hours, minutes] = (timeStr || "15:00").split(':').map(Number)
  
  const currentJsDay = now.getDay() === 0 ? 7 : now.getDay()
  const targetJsDay = targetDay === 0 ? 7 : targetDay
  
  let diff = targetJsDay - currentJsDay
  
  const targetDate = new Date(now)
  targetDate.setDate(now.getDate() + diff)
  targetDate.setHours(hours, minutes, 0, 0)
  
  // If targetDate is in the past, move it to the NEXT upcoming week's deadline!
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 7)
  }
  
  return targetDate
}

async function checkAndSendReminders() {
  if (isRunning) return
  isRunning = true

  try {
    const config = await getSettings()
    
    let targetDeadline = null
    
    if (config.REMINDER_TYPE === 'CUSTOM' && config.REMINDER_CUSTOM_DATE) {
      targetDeadline = new Date(config.REMINDER_CUSTOM_DATE)
    } else {
      // Default to WEEKLY
      targetDeadline = getNextWeeklyDeadline(config.REMINDER_DAY || "1", config.REMINDER_TIME || "15:00")
    }

    if (!targetDeadline || isNaN(targetDeadline.getTime())) {
      isRunning = false
      return
    }

    const now = new Date()
    const diffMs = targetDeadline.getTime() - now.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    // We use targetDeadline.toISOString() as part of the details to ensure we only send once per deadline.
    const deadlineKey = targetDeadline.toISOString()

    const warningEnabled = config.WARNING_ENABLED === 'true'
    const warningHours = config.WARNING_HOURS ? parseInt(config.WARNING_HOURS) : 6
    // Are we in the warning window? (Between exactly X hours before and the deadline itself)
    const isWarningWindow = warningEnabled && diffHours > 0 && diffHours <= warningHours
    // Are we past the deadline?
    // We allow a window of up to 24 hours past the deadline so we don't send emails forever
    const isMissedWindow = diffHours <= 0 && diffHours > -24

    if (!isWarningWindow && !isMissedWindow) {
      isRunning = false
      return
    }

    // Determine current ISO week Monday to check if they have a report for this week
    const day = now.getDay() || 7 // 1-7
    const mondayThisWeek = new Date(now)
    mondayThisWeek.setHours(0, 0, 0, 0)
    mondayThisWeek.setDate(now.getDate() - day + 1)

    // Fetch all active users
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      }
    })

    for (const user of users) {
      if (!user.email) continue

      // Did they submit a report this week?
      const recentReport = await prisma.report.findFirst({
        where: {
          userId: user.id,
          isAnnual: false,
          createdAt: {
            gte: mondayThisWeek
          }
        }
      })

      if (recentReport) {
        continue
      }
      
      const logs = await prisma.systemLog.findMany({
        where: {
          userId: user.id,
          action: {
            in: ['EMAIL_WARNING_6H', 'EMAIL_MISSED_DEADLINE']
          },
          details: {
            contains: deadlineKey
          }
        }
      })

      const hasReceivedWarning = logs.some(l => l.action === 'EMAIL_WARNING_6H')
      const hasReceivedMissed = logs.some(l => l.action === 'EMAIL_MISSED_DEADLINE')

      if (isWarningWindow && !hasReceivedWarning) {
        // Send warning
        const warningHours = config.WARNING_HOURS ? parseInt(config.WARNING_HOURS) : 6;
        const defaultWarningSubject = "Rapor Hatırlatması";
        const defaultWarningContent = "Merhaba {{name}},\n\nBu hafta faaliyet raporunuzu henüz sisteme girmediniz. Raporunuzu iletmeniz için {{hours}} saat kaldı. Lütfen en kısa sürede raporunuzu ekleyiniz.\n\nİyi çalışmalar.";
        
        let subject = config.WARNING_MESSAGE_SUBJECT || defaultWarningSubject;
        let text = (config.WARNING_MESSAGE_CONTENT || defaultWarningContent)
          .replace(/{{name}}/g, user.name || '')
          .replace(/{{hours}}/g, warningHours.toString())
          .replace(/{{deadline}}/g, targetDeadline.toLocaleString('tr-TR'));

        const sent = await sendEmail(config, user.email, subject, text)
        
        if (sent) {
          await prisma.systemLog.create({
            data: {
              userId: user.id,
              action: 'EMAIL_WARNING_6H', // Keeping action name for backward compatibility
              details: JSON.stringify({ deadline: deadlineKey }),
            }
          })
          console.log(`Sent warning to ${user.email}`)
        }
      }

      if (isMissedWindow && !hasReceivedMissed) {
        // Send missed deadline
        const defaultMissedSubject = "Rapor Süresi Doldu";
        const defaultMissedContent = "Merhaba {{name}},\n\nBu hafta belirlenen {{deadline}} mühleti içerisinde, faaliyet raporunuzu sisteme girmediniz. Lütfen en kısa sürede raporunuzu ekleyiniz.\n\nİyi çalışmalar.";

        let subject = config.MISSED_MESSAGE_SUBJECT || defaultMissedSubject;
        let text = (config.MISSED_MESSAGE_CONTENT || defaultMissedContent)
          .replace(/{{name}}/g, user.name || '')
          .replace(/{{deadline}}/g, targetDeadline.toLocaleString('tr-TR'));

        const sent = await sendEmail(config, user.email, subject, text)
        
        if (sent) {
          await prisma.systemLog.create({
            data: {
              userId: user.id,
              action: 'EMAIL_MISSED_DEADLINE',
              details: JSON.stringify({ deadline: deadlineKey }),
            }
          })
          console.log(`Sent missed deadline warning to ${user.email}`)
        }
      }
    }

  } catch (error) {
    console.error("Error in checkAndSendReminders:", error)
  } finally {
    isRunning = false
  }
}

console.log("Email reminder background service started.")

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running checkAndSendReminders...`)
  checkAndSendReminders()
})

checkAndSendReminders()

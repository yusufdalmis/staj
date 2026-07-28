export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["REMINDER_TYPE", "REMINDER_DAY", "REMINDER_TIME", "REMINDER_CUSTOM_DATE"] } }
    })

    let reminderType = "WEEKLY"
    let reminderDay = 1 // default Monday
    let reminderTime = "15:00" // default 15:00
    let reminderCustomDate = ""

    settings.forEach((s: any) => {
      let val = s.value
      try {
        const parsed = JSON.parse(s.value)
        if (Array.isArray(parsed) && parsed.length > 0) {
          val = parsed[0]
        }
      } catch (e) {}

      if (s.key === "REMINDER_TYPE") reminderType = val
      if (s.key === "REMINDER_DAY") reminderDay = parseInt(val) || 1
      if (s.key === "REMINDER_TIME") reminderTime = val || "15:00"
      if (s.key === "REMINDER_CUSTOM_DATE") reminderCustomDate = val
    })

    const now = new Date()
    let shouldCheck = false

    if (reminderType === "CUSTOM" && reminderCustomDate) {
      const targetDeadline = new Date(reminderCustomDate)
      // Check if target custom deadline has passed
      if (!isNaN(targetDeadline.getTime()) && now >= targetDeadline) {
        shouldCheck = true
      }
    } else {
      const currentDay = now.getDay() === 0 ? 7 : now.getDay()
      const adjustedReminderDay = reminderDay === 0 ? 7 : reminderDay
      const [remHour, remMin] = reminderTime.split(":").map(Number)
      
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // For weekly reminders, only check on the exact deadline day after the deadline time has arrived
      if (currentDay === adjustedReminderDay) {
        if (currentHour > remHour || (currentHour === remHour && currentMinute >= remMin)) {
          shouldCheck = true
        }
      }
    }

    // If the deadline date/time has NOT arrived yet (e.g., target date is in the future), do NOT report missing warnings!
    if (!shouldCheck) {
      return NextResponse.json({ 
        warnings: [],
        missingCount: 0 
      })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)

    // Build user filter condition based on role and unit
    const userWhere: any = { role: "USER", isActive: true }
    if (session.user.role === "ADMIN" && session.user.unit) {
      userWhere.unit = session.user.unit
    }

    // Get matching users
    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, unit: true }
    })

    // Get reports in the last 7 days
    const recentReports = await prisma.report.findMany({
      where: {
        isAnnual: false,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: { userId: true }
    })

    const usersWithReports = new Set(recentReports.map(r => r.userId))
    const missingUsers = users.filter(u => !usersWithReports.has(u.id))
    
    const warnings = []

    if (missingUsers.length > 0) {
      const names = missingUsers.map(u => u.name || "İsimsiz").join(", ")
      
      const title = reminderType === "CUSTOM" 
        ? "Belirlenen Tarihte Rapor Girmeyenler" 
        : "Son 7 Günde Rapor Girmeyenler"

      const message = reminderType === "CUSTOM" && reminderCustomDate
        ? `${missingUsers.length} kullanıcı belirlenen tarihe kadar (${new Date(reminderCustomDate).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}) rapor girmedi: ${names}`
        : `${missingUsers.length} kullanıcı son 7 gün içinde rapor girmedi: ${names}`

      warnings.push({
        id: "missing_reports_deadline",
        title: title,
        message: message,
        type: "warning"
      })
    }

    return NextResponse.json({ 
      warnings,
      missingCount: missingUsers.length 
    })

  } catch (error) {
    console.error("Error checking notifications:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

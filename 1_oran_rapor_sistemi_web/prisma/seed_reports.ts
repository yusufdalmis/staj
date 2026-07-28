import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Get first user
  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!user) {
    user = await prisma.user.findFirst()
  }

  if (!user) {
    console.log('No user found to assign reports to. Create a user first.')
    return
  }

  console.log(`Creating reports for user: ${user.name} (${user.email})`)

  const units = ["Genel Sekreterlik", "Kırsal Kalkınma ve Turizm Birimi", "Kayseri YDO", "Sivas YDO", "Yozgat YDO"]
  const sops = ["İmalat Sanayinde Katma Değerli Üretimin Geliştirilmesi SOP", "Yerel Kalkınma Fırsatları", "Kurumsal Gelişim"]
  const components = ["Araştırma, Analiz ve Programlama", "İşbirliği ve Koordinasyon", "Kapasite Geliştirme"]
  const programTypes = ["SOGEP", "SOGREEN", "YKH"]

  // Base64 dummy image (small 1x1 transparent png)
  const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

  // Create 5 Weekly Reports
  for (let i = 1; i <= 5; i++) {
    await prisma.report.create({
      data: {
        userId: user.id,
        unit: units[i % units.length],
        isAnnual: false,
        status: i % 2 === 0 ? 'APPROVED' : 'PENDING',
        activities: {
          create: [
            {
              description: `Haftalık Faaliyet Açıklaması ${i}.1: Bu hafta SOGEP kapsamında çeşitli görüşmeler yapıldı.`,
              projectRefNo: `TR72/26/SGR-00${i}`,
              programType: programTypes[i % programTypes.length],
              stakeholders: ["Valilik", "Belediye", "KOSGEB"],
              photo1: dummyImage,
              photo2: dummyImage
            },
            {
              description: `Haftalık Faaliyet Açıklaması ${i}.2: Bölgesel kalkınma toplantısına katılım sağlandı.`,
              stakeholders: ["Üniversite", "Sanayi Odası"],
              photo1: dummyImage,
              photo2: dummyImage
            }
          ]
        }
      }
    })
    console.log(`Created Weekly Report ${i}`)
  }

  // Create 5 Annual Reports
  for (let i = 1; i <= 5; i++) {
    await prisma.report.create({
      data: {
        userId: user.id,
        unit: units[(i + 2) % units.length],
        isAnnual: true,
        status: i % 2 === 0 ? 'APPROVED' : 'PENDING',
        activities: {
          create: [
            {
              description: `Yıllık Rapor Faaliyeti ${i}: Yıl boyunca yapılan saha çalışmaları özetlendi.`,
              stakeholders: ["Bakanlık"],
              photo1: dummyImage,
              photo2: dummyImage
            }
          ]
        },
        annualDetails: {
          create: {
            sopName: sops[i % sops.length],
            sopRefNo: `SOP-2026-${i}`,
            reportPeriod: "Ocak-Haziran 2026",
            budget: 1500000 + (i * 100000),
            sopDuration: "24 Ay",
            sopSummary: `Bu SOP kapsamında ${i}. döneme ait hedeflerin %${50 + i * 5} kadarı başarıyla tamamlanmıştır.`,
            components: {
              create: [
                {
                  name: components[i % components.length],
                  status: "Devam Ediyor",
                  delayReason: i % 3 === 0 ? "İhale süreçlerindeki gecikme" : null,
                  progress: "Çalıştaylar tamamlandı, raporlama aşamasına geçildi."
                }
              ]
            },
            resultIndicators: {
              create: [
                {
                  name: `Sonuç Göstergesi ${i}`,
                  unit: "Adet",
                  initialValue: "0",
                  target: "10",
                  periodValue: "5"
                }
              ]
            },
            outputIndicators: {
              create: [
                {
                  name: `Çıktı Göstergesi ${i}`,
                  unit: "Kişi",
                  target: "500",
                  periodValue: "250"
                }
              ]
            },
            milestones: {
              create: [
                {
                  name: `Eşik Noktası ${i}: İhale ilanı`,
                  plannedDate: "01.03.2026",
                  actualDate: "15.03.2026"
                }
              ]
            },
            evaluations: {
              create: [
                {
                  section: "Genel Değerlendirme",
                  description: "Hedeflere büyük oranda ulaşılmış olup, bütçe kullanımı planlanan şekilde ilerlemektedir."
                }
              ]
            },
            improvementSuggestions: {
              create: [
                {
                  lessonLearned: "Saha ziyaretleri daha sık yapılmalı.",
                  suggestion: "Aylık rutin ziyaret programı oluşturulacak.",
                  relatedSopArea: "İzleme ve Değerlendirme"
                }
              ]
            }
          }
        }
      }
    })
    console.log(`Created Annual Report ${i}`)
  }

  console.log('Seed completed successfully.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

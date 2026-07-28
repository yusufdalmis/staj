import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Cleaning up existing reports...")
  await prisma.report.deleteMany({}) // Clean slate

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  })

  if (!adminUser) {
    console.error("No admin user found. Please create a user first.")
    return
  }

  const userId = adminUser.id

  const placeholderImage1 = "https://placehold.co/600x400/e2e8f0/475569?text=Faaliyet+Gorseli+1"
  const placeholderImage2 = "https://placehold.co/600x400/e2e8f0/475569?text=Faaliyet+Gorseli+2"

  console.log("Creating 5 Weekly Reports...")
  for (let i = 1; i <= 5; i++) {
    await prisma.report.create({
      data: {
        userId,
        unit: i % 2 === 0 ? "Genel Sekreterlik" : "Sivas YDO",
        isAnnual: false,
        status: "APPROVED",
        activities: {
          create: [
            {
              description: `${i}. Hafta kapsamında firmalar ziyaret edildi. Gerekli toplantılar gerçekleştirildi.`,
              projectRefNo: `PRJ-2026-00${i}`,
              programType: "SOGEP",
              stakeholders: ["Sivas Valiliği", "Sivas TSO"],
              photo1: placeholderImage1,
              photo2: placeholderImage2
            },
            {
              description: `Sanayi dönüşümü bilgilendirme semineri düzenlendi. ${i * 10} katılımcı yer aldı.`,
              programType: "Teknik Destek (TD)",
              photo1: placeholderImage1,
              photo2: placeholderImage2
            }
          ]
        }
      }
    })
  }

  console.log("Creating 5 Annual Reports...")
  const sops = [
    "İmalat Sanayinde Katma Değerli Üretimin Geliştirilmesi SOP",
    "Alternatif Turizm İmkânlarının Geliştirilmesi SOP",
    "Kırsalda Yenilikçi Ve Sürdürülebilir Kalkınma SOP",
    "Yerel Kalkınma Fırsatları",
    "Kurumsal Gelişim"
  ]

  for (let i = 0; i < 5; i++) {
    await prisma.report.create({
      data: {
        userId,
        unit: "Kırsal Kalkınma ve Turizm Birimi",
        isAnnual: true,
        status: "PENDING",
        activities: {
          create: [
            {
              description: `${sops[i]} kapsamında yıl boyu süren saha analizleri tamamlanmıştır. Raporlar hazırlandı.`,
              programType: "YKH",
              stakeholders: ["Bakanlık", "Belediyeler"],
              photo1: placeholderImage1,
              photo2: placeholderImage2
            }
          ]
        },
        annualDetails: {
          create: {
            sopName: sops[i],
            sopRefNo: `SOP-2026-0${i+1}`,
            reportPeriod: "2026 Yılı",
            budget: (i+1) * 1500000,
            sopDuration: "12 Ay",
            sopSummary: `${sops[i]} hedefleri doğrultusunda planlanan tüm çalışmalar büyük oranda başarıyla yürütülmüştür.`,
            
            components: {
              create: [
                {
                  name: "Araştırma, Analiz ve Programlama",
                  status: "Tamamlandı",
                  progress: "%100",
                },
                {
                  name: "İşbirliği ve Koordinasyon",
                  status: "Devam Ediyor",
                  delayReason: "Paydaş dönüşlerinde gecikme",
                  progress: "%60",
                },
                {
                  name: "İzleme ve Değerlendirme",
                  status: "Planlandı",
                  progress: "%0",
                }
              ]
            },
            
            resultIndicators: {
              create: [
                {
                  name: "Desteklenen İşletme Sayısı",
                  unit: "Adet",
                  initialValue: "0",
                  target: "50",
                  periodValue: "35"
                },
                {
                  name: "Oluşturulan İstihdam",
                  unit: "Kişi",
                  initialValue: "0",
                  target: "100",
                  periodValue: "120"
                }
              ]
            },
            
            outputIndicators: {
              create: [
                {
                  name: "Düzenlenen Eğitim",
                  unit: "Adet",
                  target: "10",
                  periodValue: "8"
                }
              ]
            },

            evaluations: {
              create: [
                {
                  section: "İlgililik (Relevance)",
                  description: "Proje hedefleri bölgesel ihtiyaçlarla doğrudan örtüşmektedir."
                },
                {
                  section: "Etkililik (Effectiveness)",
                  description: "Planlanan çıktılara %85 oranında ulaşılmıştır."
                }
              ]
            },

            improvementSuggestions: {
              create: [
                {
                  lessonLearned: "Sahadaki veri toplama süreçleri yavaş.",
                  suggestion: "Dijital anket altyapısı kurulmalı.",
                  relatedSopArea: "Kapasite Geliştirme"
                }
              ]
            }
          }
        }
      }
    })
  }

  console.log("Database seeded successfully with rich dummy data!")
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })

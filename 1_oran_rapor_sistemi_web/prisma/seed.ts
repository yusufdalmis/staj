import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@oran.org.tr' },
    update: {},
    create: {
      email: 'admin@oran.org.tr',
      password: adminPassword,
      name: 'Rapor Yöneticisi',
      role: 'ADMIN',
    },
  })
  console.log("Admin user created")

  const superAdminPassword = await hash('superadmin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'superadmin@oran.org.tr' },
    update: {
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      isActive: true
    },
    create: {
      email: 'superadmin@oran.org.tr',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    },
  })
  console.log("Super Admin user created")

  const defaultPassword = await hash('Oran2026', 10)

  // Cleanup obsolete or replaced email addresses
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'ahmetkilci@oran.org.tr',
          'gonca.cevik.ozkaya@gmail.com',
          'seyitcezaoglu@gmail.com'
        ]
      }
    }
  }).catch(() => {})

  const users = [
    // Genel Sekreterlik
    { name: 'Zehra GÜNGÖREN', unit: 'Genel Sekreterlik', email: 'zehragungoren@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Yunus ŞEKER', unit: 'Genel Sekreterlik', email: 'yunusseker@oran.org.tr', role: 'ADMIN', isActive: true },

    // Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi
    { name: 'Mahir BÜYÜKTALASLIOĞLU', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'mahir.buyuktalaslioglu@oran.org.tr', role: 'USER', isActive: false },
    { name: 'Funda ÇİFÇİ', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'funda8323@gmail.com', role: 'USER', isActive: false },
    { name: 'Hayriye SARIKAYA', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'sarikayahayriye.38@gmail.com', role: 'USER', isActive: false },
    { name: 'Nükhet GÜRCAN', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'nukhetgurcan@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Erdin KARAARSLAN', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'erdinkaraarslan@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Abdullah Enes TÖKEN', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'enestoken@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Ethem BOZKURT', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'ethembozkurt@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Nimet TAHTASAKAL', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'nimettahtasakal@oran.org.tr', role: 'ADMIN', isActive: true },
    { name: 'Hatice BAYRAKTAR', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'haticebayraktar@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Şerife ÖZSARAÇ BAYER', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'serifeozsarac@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Mustafa KARAKAYA', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'mustafakarakaya@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Mehmet Ali BAYIR', unit: 'Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi', email: 'mehmetalibayir@oran.org.tr', role: 'SUPER_ADMIN', isActive: true },

    // Yozgat YDO
    { name: 'Figen KIZILASLAN', unit: 'Yozgat YDO', email: 'fgnbykrt@gmail.com', role: 'USER', isActive: false },
    { name: 'Yücel EROL', unit: 'Yozgat YDO', email: 'yucelerol@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Filiz AÇIKEL', unit: 'Yozgat YDO', email: 'filizacikel@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Eda Esma ŞAHİN', unit: 'Yozgat YDO', email: 'edaesmasahin@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Doğu SEZEN', unit: 'Yozgat YDO', email: 'dogusezen@oran.org.tr', role: 'ADMIN', isActive: true },

    // Sivas YDO
    { name: 'Burcu ÜNAL', unit: 'Sivas YDO', email: 'burcu.d.unal@gmail.com', role: 'USER', isActive: false },
    { name: 'Sinan GÜZEY', unit: 'Sivas YDO', email: 'sinanguzey@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Muhammed EKER', unit: 'Sivas YDO', email: 'muhammedeker@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Lütfullah YAŞAR', unit: 'Sivas YDO', email: 'lutfullahyasar@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Emel DEMİREL', unit: 'Sivas YDO', email: 'emeldemirel@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Tuba Parlak UZUNOĞLU', unit: 'Sivas YDO', email: 'tubauzunoglu@oran.org.tr', role: 'ADMIN', isActive: true },

    // Kayseri YDO
    { name: 'Yusuf AKSÖZ', unit: 'Kayseri YDO', email: 'yusufaksoz@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Nurullah TOPKARAOĞLU', unit: 'Kayseri YDO', email: 'nurullahtopkaraoglu@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Seyit CEZAOĞLU', unit: 'Kayseri YDO', email: 'seyitcezaoglu@oran.org.tr', role: 'ADMIN', isActive: true },

    // İmalat Sanayide Dönüşüm Birimi
    { name: 'Furkan CESUR', unit: 'İmalat Sanayide Dönüşüm Birimi', email: 'furkancesur@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Sinem KARAER', unit: 'İmalat Sanayide Dönüşüm Birimi', email: 'sinemkaraer@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Fazıl GÜLER', unit: 'İmalat Sanayide Dönüşüm Birimi', email: 'fazilguler@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Serdar ARSLAN', unit: 'İmalat Sanayide Dönüşüm Birimi', email: 'serdararslan@oran.org.tr', role: 'ADMIN', isActive: true },

    // Kırsal Kalkınma ve Turizm Birimi
    { name: 'Timur YILDIZ', unit: 'Kırsal Kalkınma ve Turizm Birimi', email: 'timuryildiz@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Özay Deniz KESKİN', unit: 'Kırsal Kalkınma ve Turizm Birimi', email: 'ozaykeskin@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Behiye Ayşe Gonca ÖZKAYA', unit: 'Kırsal Kalkınma ve Turizm Birimi', email: 'goncaozkaya@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Ali DURMUŞ', unit: 'Kırsal Kalkınma ve Turizm Birimi', email: 'alidurmus@oran.org.tr', role: 'USER', isActive: true },
    { name: 'Yasin ZİCİN', unit: 'Kırsal Kalkınma ve Turizm Birimi', email: 'yasinzicin@oran.org.tr', role: 'ADMIN', isActive: true }
  ];

  for (const user of users) {
    const email = user.email;
    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        unit: user.unit,
        role: user.role as any,
        isActive: user.isActive,
      },
      create: {
        email,
        password: defaultPassword,
        name: user.name,
        role: user.role as any,
        unit: user.unit,
        isActive: user.isActive,
      },
    })
  }

  console.log(`Seeded ${users.length} users successfully.`)

  const DEFAULT_SETTINGS: Record<string, string[]> = {
    UNITS: [
      "Genel Sekreterlik",
      "İmalat Sanayide Dönüşüm Birimi",
      "Kırsal Kalkınma ve Turizm Birimi",
      "Yatırım Destek Ofisi Faaliyetleri (YDO)",
      "Kurumsal Yönetim, Koordinasyon ve Tanıtım Birimi"
    ],
    SUB_UNITS: [
      "Kayseri YDO",
      "Sivas YDO",
      "Yozgat YDO"
    ],
    SOPS: [
      "İmalat Sanayinde Katma Değerli Üretimin Geliştirilmesi SOP",
      "Alternatif Turizm İmkânlarının Geliştirilmesi SOP",
      "Kırsalda Yenilikçi Ve Sürdürülebilir Kalkınma SOP",
      "Yerel Kalkınma Fırsatları",
      "Kurumsal Gelişim"
    ],
    PROGRAM_TYPES: [
      "SOGREEN", "SOGEP", "YKH", "Teknik Destek (TD)", "CMDP", "Diğer"
    ],
    COMPONENTS: [
      "Araştırma, Analiz ve Programlama",
      "İşbirliği ve Koordinasyon",
      "Kapasite Geliştirme",
      "Tanıtım ve Yatırım Destek",
      "Ajans Destekleri",
      "İzleme ve Değerlendirme",
      "AB ve Diğer Dış Kaynaklı Programlar Kapsamındaki Projeler",
      "Diğer Proje ve Faaliyetler"
    ],
    CONTACTED_INSTITUTIONS: [
      "Kalkınma Ajansları Genel Müdürlüğü",
      "Sanayi ve Teknoloji Bakanlığı",
      "İstanbul Kalkınma Ajansı",
      "Trakya Kalkınma Ajansı",
      "Güney Marmara Kalkınma Ajansı",
      "İzmir Kalkınma Ajansı",
      "Zafer Kalkınma Ajansı",
      "Güney Ege Kalkınma Ajansı",
      "Doğu Marmara Kalkınma Ajansı",
      "Bursa Eskişehir Bilecik Kalkınma Ajansı",
      "Ankara Kalkınma Ajansı",
      "Mevlana Kalkınma Ajansı",
      "Batı Akdeniz Kalkınma Ajansı",
      "Çukurova Kalkınma Ajansı",
      "Doğu Akdeniz Kalkınma Ajansı",
      "Ahiler Kalkınma Ajansı",
      "Orta Anadolu Kalkınma Ajansı",
      "Batı Karadeniz Kalkınma Ajansı",
      "Kuzey Anadolu Kalkınma Ajansı",
      "Orta Karadeniz Kalkınma Ajansı",
      "Doğu Karadeniz Kalkınma Ajansı",
      "Kuzeydoğu Anadolu Kalkınma Ajansı",
      "Serhat Kalkınma Ajansı",
      "Fırat Kalkınma Ajansı",
      "Doğu Anadolu Kalkınma Ajansı",
      "İpekyolu Kalkınma Ajansı",
      "Karacadağ Kalkınma Ajansı",
      "Dicle Kalkınma Ajansı",
      "İl Millî Eğitim Müdürlüğü",
      "Aile ve Sosyal Hizmetler İl Müdürlüğü",
      "İl Kültür ve Turizm Müdürlüğü",
      "Gençlik ve Spor İl Müdürlüğü",
      "İl Sağlık Müdürlüğü",
      "İl Tarım ve Orman Müdürlüğü",
      "Çevre, Şehircilik ve İklim Değişikliği İl Müdürlüğü",
      "İl Emniyet Müdürlüğü",
      "İl Nüfus ve Vatandaşlık Müdürlüğü",
      "İl Göç İdaresi Müdürlüğü",
      "İl Afet ve Acil Durum Müdürlüğü (AFAD)",
      "İl Ticaret Müdürlüğü",
      "Sanayi ve Teknoloji İl Müdürlüğü",
      "İl Defterdarlığı",
      "Çalışma ve İş Kurumu İl Müdürlüğü (İŞKUR)",
      "Sosyal Güvenlik Kurumu (SGK) İl Müdürlüğü:",
      "Karayolları 6. Bölge Müdürlüğü",
      "DSİ (Devlet Su İşleri) 12. Bölge Müdürlüğü",
      "Meteoroloji 7. Bölge Müdürlüğü",
      "Tapu ve Kadastro 11. Bölge Müdürlüğü",
      "Vakıflar Bölge Müdürlüğü",
      "Erciyes Üniversitesi",
      "Abdullah Gül Üniversitesi",
      "Kayseri Üniversitesi",
      "Nuh Naci Yazgan Üniversitesi",
      "Erciyes Teknopark",
      "AGÜ Teknopark",
      "Sivas Cumhuriyet Üniversitesi",
      "Sivas Bilim ve Teknoloji Üniversitesi",
      "Sivas Teknokent (Cumhuriyet Teknokent)",
      "Sivas Bilim ve Teknoloji Üniversitesi Teknoparkı",
      "Yozgat Bozok Üniversitesi",
      "İŞGEM",
      "KOSGEB"
    ],
    COMPONENT_STATUSES: [
      "Zamanında Tamamlandı",
      "Gecikme ile Tamamlandı",
      "Devam Ediyor",
      "Başlamadı"
    ],
    PROVINCES: [
      "Kayseri",
      "Sivas",
      "Yozgat"
    ],
    BUDGET_CODES: [
      "01.01.01.01.01 - Personel Ücretleri",
      "01.01.01.01.02 - İhbar ve Kıdem Tazminatları",
      "01.01.01.01.03 - Sosyal Haklar",
      "01.01.01.01.04 - Fazla Mesailer",
      "01.01.01.01.05 - Ödül ve İkramiyeler",
      "01.01.01.01.09 - Diğer Ödemeler",
      "01.01.01.02.01 - İşsizlik Sigortası Fonuna Ödemeler",
      "01.01.01.02.02 - Sosyal Güvenlik Kurumuna Ödemeler",
      "01.01.01.03.02 - Tüketime Yönelik Mal ve Malzeme Alımları",
      "01.01.01.03.03 - Yolluklar",
      "01.01.01.03.04 - Görev Giderleri",
      "01.01.01.03.05 - Hizmet Alımları",
      "01.01.01.03.06 - Temsil ve Tanıtma Giderleri",
      "01.01.01.03.07 - Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
      "01.01.01.03.08 - Gayrimenkul Mal Bakım ve Onarım Giderleri",
      "01.01.01.03.09 - Teknik Destek Giderleri",
      "01.01.01.05.09 - Diğer Cari Transferler",
      "01.01.01.06.01 - Mamul Mal Alımları",
      "01.01.01.06.02 - Menkul Sermaye Üretim Giderleri",
      "01.01.01.06.03 - Gayri Maddi Hak Alımları",
      "01.01.01.06.04 - Gayrimenkul Alımları",
      "01.01.01.06.05 - Gayrimenkul Sermaye Üretim Giderleri",
      "01.01.01.06.06 - Menkul Malların Büyük Onarım Giderleri",
      "01.01.01.06.07 - Gayrimenkul Büyük Onarım Giderleri",
      "01.01.01.06.08 - Diğer Sermaye Giderleri",
      "01.01.01.09.09 - Yedek Ödenek",
      "01.02.01.03.02 - Tüketime Yönelik Mal ve Malzeme Alımları",
      "01.02.01.03.03 - Yolluklar",
      "01.02.01.03.04 - Görev Giderleri",
      "01.02.01.03.05 - Hizmet Alımları",
      "01.02.01.03.06 - Temsil ve Tanıtma Giderleri",
      "01.02.01.03.07 - Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
      "01.02.01.03.08 - Gayrimenkul Mal Bakım ve Onarım Giderleri",
      "01.02.01.03.09 - Teknik Destek Giderleri",
      "01.03.01.03.02 - Tüketime Yönelik Mal ve Malzeme Alımları",
      "01.03.01.03.03 - Yolluklar",
      "01.03.01.03.04 - Görev Giderleri",
      "01.03.01.03.05 - Hizmet Alımları",
      "01.03.01.03.06 - Temsil ve Tanıtma Giderleri",
      "01.03.01.03.07 - Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
      "01.03.01.03.08 - Gayrimenkul Mal Bakım ve Onarım Giderleri",
      "01.03.01.03.09 - Teknik Destek Giderleri",
      "01.04.01.03.02 - Tüketime Yönelik Mal ve Malzeme Alımları",
      "01.04.01.03.03 - Yolluklar",
      "01.04.01.03.04 - Görev Giderleri",
      "01.04.01.03.05 - Hizmet Alımları",
      "01.04.01.03.06 - Temsil ve Tanıtma Giderleri",
      "01.04.01.03.07 - Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
      "01.04.01.03.08 - Gayrimenkul Mal Bakım ve Onarım Giderleri",
      "01.04.01.03.09 - Teknik Destek Giderleri",
      "01.05.01.03.02 - Tüketime Yönelik Mal ve Malzeme Alımları",
      "01.05.01.03.03 - Yolluklar",
      "01.05.01.03.04 - Görev Giderleri",
      "01.05.01.03.05 - Hizmet Alımları",
      "01.05.01.03.06 - Temsil ve Tanıtma Giderleri",
      "01.05.01.03.07 - Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
      "01.05.01.03.08 - Gayrimenkul Mal Bakım ve Onarım Giderleri",
      "01.05.01.03.09 - Teknik Destek Giderleri",
      "02.01.01.07.01 - Proje Teklif Çağrısı Yöntemiyle Verilen Destekler",
      "02.01.01.07.03 - Güdümlü Proje Destekleri",
      "02.01.01.07.04 - Finansman Desteği",
      "02.01.01.07.05 - Faizsiz Kredi Desteği",
      "02.01.01.07.09 - Diğer Sermaye Transfeleri",
      "02.01.01.07.12 - Sosyal Gelişmeyi Destekleme Programı Desteği",
      "02.01.01.07.14 - ÇÜGEP",
      "02.01.01.07.30 - Alternatif Destek Programları-Hibe Desteği",
      "02.01.01.07.31 - Alternatif Destek Programları-Finansman/Faizsiz Kredi Desteği",
      "02.01.01.07.32 - Alternatif Destek Programı-Teknik/Mentorluk Desteği",
      "02.01.01.07.80 - Pilot Destek Uygulamaları",
      "02.01.01.07.90 - Cazibe Merkezleri Destekleme Programı Desteği",
      "02.01.01.07.91 - Sınırötesi İşbirliği Programı Desteği",
      "02.01.01.07.93 - Avrupa Birliği Fonlarından Aktarılan Paylar Kapsamında Yapılan Sermaye Transferi",
      "02.01.01.07.96 - Kurumsal Dönüşüm ve Sürdürülebilirlik Destek Programı",
      "02.01.01.07.98 - Bölgesel Kalkınma Odaklı Toparlanma Acil Eylem Programı (BOTAP) Desteği",
      "02.02.01.07.02 - Doğrudan Faaliyet Desteği",
      "02.02.01.07.08 - Fizibilite Desteği"
    ],
    REMINDER_DAY: ["1"],
    REMINDER_TIME: ["15:00"]
  }

  for (const [key, values] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key }
    })
    if (!existing) {
      await prisma.systemSetting.create({
        data: { key, value: JSON.stringify(values) }
      })
      console.log(`Added default setting: ${key}`)
    } else {
      console.log(`Setting ${key} already exists.`)
    }
  }

  console.log('Seeding completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

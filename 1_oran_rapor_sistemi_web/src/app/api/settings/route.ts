export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_SETTINGS: Record<string, string[]> = {
  UNITS: [
    "Genel Sekreterlik",
    "İmalat Sanayide Dönüşüm Birimi",
    "Kırsal Kalkınma ve Turizm Birimi",
    "Yatırım Destek Ofisi Faaliyetleri (YDO)"
  ],
  SUB_UNITS: [
    "Kayseri YDO",
    "Sivas YDO",
    "Yozgat YDO"
  ],
  SOPS: [
    "İmalat Sanayinde Katma Değerli Üretimin Geliştirilmesi SOP",
    "Alternatif Turizm İmkanlarının Geliştirilmesi SOP",
    "Kırsalda Yenilikçi Ve Sürdürülebilir Kalkınma SOP",
    "Yerel Kalkınma Fırsatları",
    "Kurumsal Gelişim"
  ],
  PROGRAM_TYPES: [
    "Değer Zinciri Analizi Çalışmaları",
    "Diğer Fon Kaynaklarına Proje Yazılmasının Özendirilmesi ve Teknik Yardım Masası Faaliyetleri",
    "Kayseri Tarıma Dayalı Sera İhtisas Organize Tarım Bölgesi ve Yerköy Tarıma Dayalı İhtisas OSB  İş Birliği ve Yenilikçi Uygulamalar",
    "Sınai Mülkiyet Hakları Faaliyetleri",
    "Anadoludakiler/Yerel Ürünleri Ticarileştirme Teması ve “Anadoludakiler” Projesi Çalışmaları",
    "Yöresel Ürünlerin Tanıtımı ve Pazarlanması",
    "Kırsal ve Sosyal Kalkınma Kapasite Geliştirme Programı",
    "“Anadoludakiler” Projesine Katkı Sağlayıcı Coğrafi İşaretli Ürün Geliştirme Programı",
    "Yöresel Ürün Tespit Çalışması",
    "Sürdürülebilir Kooperatifler ve Kadın Girişimciliğinin Geliştirilmesi Programı",
    "Bölge Tanıtımı ve Ortak Paydaş Faaliyetleri",
    "Sosyal Gelişmeyi Destekleme Programı",
    "Çalışan ve Üreten Gençler Programı",
    "TR72 Bölgesi Mesleki ve Teknolojik Eğitim Altyapısını Geliştirme Güdümlü Projesi",
    "Kırsal Sosyal Kalkınma Skala Proje Desteği",
    "Kırsal Kalkınma Teknik Destek Programı",
    "TR72 Makine İmalat Sektörü Değer Zinciri Analizi",
    "Bölgesel İş Gücü ve Mesleki Yeterlilik Analizi Çalışmaları",
    "TR72 Bölgesi İmalat Sanayi Teknik Destek Programları Etki Analizi",
    "TR72 Bölgesi İmalat Sanayi Nitelikli Raporlarının Güncellenmesi",
    "TR72 İmalat Sanayinde Yeni Yatırım Alanları ve Teknoloji Odaklı Fizibilite Çalışmaları",
    "İklim Risklerine Karşı Sanayi Tabanlı Uyum Stratejisi Geliştirilmesi",
    "İhracat Analiz Raporları",
    "Döngüsel Sanayi Heckathonu Düzenlenmesi",
    "Bölgedeki Yerel Ürünlerin Ticarileştirilmesi ve Seri Üretimi İçin Geliştirme Programı",
    "Bölge İmalat Sanayi İle İlişkili Paydaşlarla SOP Özel Amaçlarına Yönelik Ortak Faaliyetler Düzenlenmesi",
    "TR72 Ar-Ge ve Tasarım Merkezleri Tanıtım Günü",
    "Kuzey-Güney Sanayi Koridorunda TR72 Bölgesi’nin Rolü Çalışması",
    "TR72 Sanayi İşletmelerinde Sürdürülebilirlik Yönetimi ve Yeşil Uyum Çalışmaları",
    "Yaşam Döngüsü Değerlendirmesi (LCA) Eğitimleri",
    "Yeşil Dönüşüm Temelli Endüstriyel Simbiyoz Eğitimleri",
    "TR72 İmalat Sanayine Yönelik Merkezi Hibe Programlarının Tanıtımı",
    "Üreten Şehirler Programı Çalışmaları",
    "Silikon Fotonik Çip-Üstü LIDAR (Lazer İle Görüntü Tespiti Ve Uzaklık Belirleme Sistemi) Üretimi Projesi (CMDP)",
    "Sogreen Projeleri",
    "TR72 İmalat Sanayi Teknik Destek Programı",
    "TR72 İmalat Sanayi Dijitalleşme ve E-Ticaret Kapasite Geliştirme Programı",
    "TR72 Bölgesi Turizm Potansiyeli Mevcut Durum Analizi",
    "Ark Of Taste Çalışmaları",
    "Sağlık Turizmi İşbirliği Buluşması",
    "Aydıncık İlçesi 2026 UNWTO Best Tourism Villages Başvurusu",
    "UNESCO “Öğrenen Şehirler Ağı” Üyelik Faaliyetleri",
    "Turizm İşletmeleri Kapasite Geliştirme Programı",
    "Sarıkaya Turizm Çalıştayı",
    "Bölgenin Turizm Değerlerinin Tanıtımı",
    "Buruciye'de Usta Sesleri Yükseliyor Güdümlü Projesi (CMDP)",
    "Akdağmadeni Kırsal Turizm Güdümlü Projesi",
    "Alternatif Turizm Güdümlü Proje Geliştirme Faaliyetleri",
    "2026 Yılı Orta Anadolu’yu Keşfet Alternatif Mali Destek Programı",
    "2026 Teknik Destek Programı",
    "Ajansın İnsan Kaynakları Kapasitesinin Geliştirilmesi",
    "Ajans Fiziki ve Teknik Altyapısının İyileştirilmesi Hedefi Kapsamındaki Faaliyetler",
    "Tüketime Yönelik Mal ve Malzeme Alımları",
    "Yolluklar",
    "Görev Giderleri",
    "Hizmet Alımları",
    "Temsil ve Tanıtma Giderleri",
    "Menkul Mal, Gayrimaddi Hak Alım, Bakım ve Onarım Giderleri",
    "Gayrimenkul Mal Bakım ve Onarım Giderleri",
    "Teknik Destek Giderleri",
    "Mamul Mal Alımları",
    "Kurumsal İletişim ve Raporlama Faaliyetleri",
    "Personel Ücretleri",
    "İhbar ve Kıdem Tazminatları",
    "Sosyal Haklar",
    "Fazla Mesailer",
    "Ödül ve İkramiyeler",
    "Ek Çalışma Karşılıkları",
    "Diğer Ödemeler",
    "İşsizlik Sigortası Fonuna Ödemeler",
    "Sosyal Güvenlik Kurumuna Ödemeler",
    "Çalıştaylar, Araştırma Raporları ve Bilgi Notları",
    "İlçe Gelişim Planı Raporlarının Revizyonu ve İlçe Tanıtım Ziyaretleri",
    "Yatırım Alanları Kitapçıklarının Tanıtımı",
    "Firma Ziyaretleri ve Potansiyel Yatırım Konuları Araştırması",
    "Girişimcilik Faaliyetleri",
    "81 İl 81 Ürün Programı Faaliyetleri",
    "Yerel Kalkınma Hamlesi Programı",
    "Türkiye Siber Vatan Programı",
    "Bölge Kalkınma İdareleri ve Diğer Ajanslar ile İşbirliği",
    "Yürütme ve İcra Kurulu Faaliyetleri",
    "Uluslararası Yatırım Çekme ve İşbirliği Bağlantılarının Kurulması, Yurtdışı Pazar Araştırmaları",
    "Üniversite – Sanayi İşbirliği Faaliyetleri",
    "Ekonomi Bülteni Çalışmaları",
    "CMDP Proje Geliştirme Faaliyetleri ve Uluslararası Program ve Fon Kaynaklarına Başvuru Yapılması",
    "Şirket Değerleme Uygulamalı Eğitimi",
    "Yatırım Altyapısının Güçlendirilmesine Yönelik Çalışmalar",
    "Dış Ticaret Masası",
    "Yurtiçi ve Yurtdışı Fuar ve Çalışma Ziyaretleri",
    "İş İnsanı Buluşmaları",
    "KOP Proje Uygulamaları"
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
    "Sosyal Güvenlik Kurumu (SGK) İl Müdürlüğü",
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
  REMINDER_DAY: ["1"], // 1 = Monday
  REMINDER_TIME: ["15:00"],
  DOC_HEADER_TITLE_1: ["T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞI"],
  DOC_HEADER_TITLE_2: ["ORAN KALKINMA AJANSI"],
  DOC_FOOTER_TEXT: ["ORAN Kalkınma Ajansı - Faaliyet Raporu"],
  DOC_LOGO_BASE64: [""]
}

const LIST_KEYS = [
  "UNITS", "SUB_UNITS", "SOPS", "PROGRAM_TYPES", "COMPONENTS", 
  "CONTACTED_INSTITUTIONS", "PROVINCES", "BUDGET_CODES"
];

function sortListAlphanumeric(list: string[]): string[] {
  if (!Array.isArray(list)) return list;
  return [...list].sort((a, b) => a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" }));
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.systemSetting.findMany()
    const result: Record<string, string[]> = {}

    // Parse existing settings
    for (const s of settings) {
      try {
        result[s.key] = JSON.parse(s.value)
      } catch (e) {
        result[s.key] = []
      }
    }

    // Fill missing ones with defaults and save them
    for (const [key, defaultArray] of Object.entries(DEFAULT_SETTINGS)) {
      if (!result[key]) {
        result[key] = defaultArray
        // Fire and forget insert for defaults
        await prisma.systemSetting.create({
          data: {
            key,
            value: JSON.stringify(defaultArray)
          }
        }).catch(() => {}) // Ignore if already inserted by parallel request
      }
    }

    // Ensure all list items are sorted alphanumerically
    for (const key of LIST_KEYS) {
      if (result[key]) {
        result[key] = sortListAlphanumeric(result[key]);
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "SUPER_ADMIN" && session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { key, values } = data

    if (!key || !Array.isArray(values)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 })
    }

    // Sort list items alphanumerically if this key is a list
    const finalValues = LIST_KEYS.includes(key) ? sortListAlphanumeric(values) : values;

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(finalValues) },
      create: { key, value: JSON.stringify(finalValues) }
    })

    const { logAction } = await import("@/lib/logger")
    await logAction("AYAR_GUNCELLEME", { key, valuesCount: finalValues.length }, req, session.user.id)

    return NextResponse.json({ success: true, values: finalValues })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


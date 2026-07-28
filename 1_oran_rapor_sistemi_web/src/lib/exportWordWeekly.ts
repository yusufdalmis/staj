import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, AlignmentType, HeadingLevel, Header, Footer } from "docx";
import { saveAs } from "file-saver";
import { headerImageBase64 } from "./headerImageBase64";

async function getDocSettings() {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const settings = await res.json();
      return {
        title1: settings.DOC_HEADER_TITLE_1?.[0] || "T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞI",
        title2: settings.DOC_HEADER_TITLE_2?.[0] || "ORAN KALKINMA AJANSI",
        footerText: settings.DOC_FOOTER_TEXT?.[0] || "ORAN Kalkınma Ajansı - Faaliyet Raporu",
        logoBase64: settings.DOC_LOGO_BASE64?.[0] || ""
      };
    }
  } catch (e) {}
  return {
    title1: "T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞI",
    title2: "ORAN KALKINMA AJANSI",
    footerText: "ORAN Kalkınma Ajansı - Faaliyet Raporu",
    logoBase64: ""
  };
}

export async function exportWordWeekly(reports: any[]) {
  const docConfig = await getDocSettings();

  // Extract all weekly activities
  const allActivities = reports
    .flatMap(r => r.activities.map((act: any) => ({
      ...act,
      unit: r.unit,
      date: new Date(r.createdAt).toLocaleDateString("tr-TR")
    })));

  if (!reports || allActivities.length === 0) {
    throw new Error("Dışa aktarılacak faaliyet bulunamadı.");
  }

  // Determine Date Range
  const dates = allActivities.map(a => {
    const parts = a.date.split('.');
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }).sort((a: any, b: any) => a.getTime() - b.getTime());
  
  let dateRangeStr = "Tarih Aralığı Belirtilmedi";
  if (dates.length > 0) {
    const start = dates[0].toLocaleDateString("tr-TR");
    const end = dates[dates.length - 1].toLocaleDateString("tr-TR");
    dateRangeStr = start === end ? start : `${start} - ${end}`;
  }

  // Decode Header Image
  let headerImageBuffer: Uint8Array | null = null;
  try {
    const base64Str = docConfig.logoBase64 || headerImageBase64;
    const cleanBase64 = base64Str.includes(",") ? base64Str.split(",")[1] : base64Str;
    const binaryString = window.atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    headerImageBuffer = bytes;
  } catch (e) {
    console.error("Header image could not be loaded", e);
  }

  // Group activities by Unit
  const activitiesByUnit: Record<string, any[]> = {};
  for (const act of allActivities) {
    if (!activitiesByUnit[act.unit]) {
      activitiesByUnit[act.unit] = [];
    }
    activitiesByUnit[act.unit].push(act);
  }

  const activitySections: any[] = [];
  
  for (const [unit, acts] of Object.entries(activitiesByUnit)) {
    // 1. Heading for Unit
    activitySections.push(
      new Paragraph({
        text: unit,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    // 2. Summary Table
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "Faaliyet Adı", style: "Bold" })], width: { size: 20, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph({ text: "Bileşen Kodu", style: "Bold" })], width: { size: 20, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph({ text: "İlgili Kurum / Paydaşlar", style: "Bold" })], width: { size: 25, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph({ text: "Mevcut Durum", style: "Bold" })], width: { size: 15, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph({ text: "Ortak Çalışılan Birimler", style: "Bold" })], width: { size: 20, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
        ]
      }),
      ...acts.map(act => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(act.title || "-")], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph(act.programType || "-")], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph((Array.isArray(act.stakeholders) ? act.stakeholders.join(", ") : act.stakeholders) || "-")], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph(act.status || "-")], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph(act.nextStep || "-")], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
        ]
      }))
    ];

    const unitTable = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      }
    });

    activitySections.push(unitTable);
    activitySections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

    // 3. Bullet points and Photos
    for (const act of acts) {
      const descriptionText = act.projectRefNo && act.projectRefNo.trim()
        ? `${act.description || ''} (Proje Ref No: ${act.projectRefNo.trim()})`
        : (act.description || '');

      activitySections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "✓ ", font: "Times New Roman" }),
            new TextRun({ text: descriptionText })
          ],
          spacing: { after: 200 }
        })
      );

      const images: any[] = [];
      if (act.photo1) images.push(act.photo1);
      if (act.photo2) images.push(act.photo2);

      if (images.length > 0) {
        try {
          const imageRuns = await Promise.all(images.map(async (base64Str) => {
            let b64 = base64Str;
            if (b64.includes("base64,")) {
              b64 = b64.split("base64,")[1];
            }
            const binaryString = window.atob(b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            return new ImageRun({
              data: bytes,
              type: "jpg",
              transformation: {
                width: 300,
                height: 200
              }
            });
          }));

          if (images.length === 1) {
            activitySections.push(
              new Paragraph({
                children: [imageRuns[0]],
                alignment: AlignmentType.CENTER,
                keepNext: false,
                keepLines: true
              })
            );
          } else if (images.length === 2) {
            const imgTable = new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [imageRuns[0]], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [imageRuns[1]], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } })
                  ]
                })
              ]
            });
            activitySections.push(imgTable);
          }
        } catch (e) {
          console.error("Error processing images for export", e);
        }
      }
      activitySections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
    }
  }

  // 4. Financial Template at the end
  activitySections.push(new Paragraph({
    text: "Gelir Gider Mevcut Durumu:",
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 800, after: 400 },
    pageBreakBefore: true
  }));

  activitySections.push(new Paragraph({ text: "Banka:", style: "Bold", spacing: { after: 100 } }));

  const finTable1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Ajans Genel Hesap")], width: { size: 50, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Ajans Özel Hesap")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] })
    ]
  });

  activitySections.push(finTable1);
  activitySections.push(new Paragraph({ text: "", spacing: { after: 300 } }));

  activitySections.push(new Paragraph({ text: "Özel Hesaplar Detay:", style: "Bold", spacing: { after: 100 } }));

  const finTable2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }, insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      new TableRow({ children: [new TableCell({ children: [new Paragraph("KOP BKİ Tarafından Verilen Şartlı Bağış ve Yardımlar")], width: { size: 50, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("SOGEP Hesapları")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("CMDP Hesabı")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Üreten Şehirler")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("Sogreen Projeleri")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... TL")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] }),
      new TableRow({ children: [new TableCell({ children: [new Paragraph("AB Proje Hesabı (Halkbank Özel Hesap)")], margins: { top: 80, bottom: 80, left: 100, right: 100 } }), new TableCell({ children: [new Paragraph(".......................... EUR")], margins: { top: 80, bottom: 80, left: 100, right: 100 } })] })
    ]
  });

  activitySections.push(finTable2);
  activitySections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  activitySections.push(new Paragraph({ text: "Gelir:", style: "Bold", spacing: { before: 200, after: 100 } }));
  activitySections.push(new Paragraph("Diğer Gelirler ve Katkı Payları: .......................... TL"));
  activitySections.push(new Paragraph("TOPLAM: .......................... TL"));

  activitySections.push(new Paragraph({ text: "Gider:", style: "Bold", spacing: { before: 200, after: 100 } }));
  activitySections.push(new Paragraph("Proje ve Diğer ödemeler: .......................... TL"));
  activitySections.push(new Paragraph("TOPLAM: .......................... TL"));

  function getCoverPage() {
    return [
      new Paragraph({ text: "", spacing: { before: 2000, after: 2000 } }),
      new Paragraph({
        children: [new TextRun({ text: docConfig.title1, color: "B31B1B", size: 24, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: docConfig.title2, color: "B31B1B", size: 36, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Haftalık Faaliyet Raporu", color: "B31B1B", size: 32, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Table({
        width: { size: 60, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: {
           top: { style: BorderStyle.SINGLE, size: 4, color: "A0C4FF" },
           bottom: { style: BorderStyle.SINGLE, size: 4, color: "A0C4FF" },
           left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
           right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
           insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
           insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
           new TableRow({
             children: [
               new TableCell({
                 children: [
                   new Paragraph({ 
                     children: [new TextRun({ text: dateRangeStr, color: "3B82F6", size: 28 })],
                     alignment: AlignmentType.CENTER 
                   })
                 ],
                 margins: { top: 100, bottom: 100 }
               })
             ]
           })
        ]
      }),
      new Paragraph({
        text: "",
        pageBreakBefore: true,
      }),
    ];
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12 pt
          },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Times New Roman", size: 24 },
          paragraph: { alignment: AlignmentType.JUSTIFIED },
        },
      ],
    },
    sections: [
      {
        properties: {},
        headers: headerImageBuffer ? {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: headerImageBuffer,
                    type: "png",
                    transformation: { width: 600, height: 104 },
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        } : undefined,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  top: { color: "B31B1B", space: 1, style: BorderStyle.SINGLE, size: 12 }
                },
                children: [
                  new TextRun({ text: docConfig.footerText, size: 18, color: "666666" })
                ]
              })
            ]
          })
        },
        children: [
          ...getCoverPage(),
          ...activitySections
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Haftalik_Faaliyet_Raporu.docx");
}

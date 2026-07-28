import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, HeadingLevel, ShadingType, AlignmentType, VerticalAlign, TextDirection, PageOrientation, Header, Footer, ImageRun, PageNumber, HeightRule } from "docx";
import { saveAs } from "file-saver";

const defaultBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
};

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

function getCoverPage(title: string, subtitle: string, docConfig?: any) {
  return [
    new Paragraph({
      text: docConfig?.title1 || "T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞI",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000, after: 200 },
    }),
    new Paragraph({
      text: docConfig?.title2 || "ORAN KALKINMA AJANSI",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: subtitle,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
  ];
}

// Helper function to group and merge annual reports belonging to the same SOP under a unit
function groupAndMergeReportsBySop(unitReports: any[]) {
  const sopGroupsMap: Map<string, any[]> = new Map();

  for (const report of unitReports) {
    const ad = report.annualDetails;
    if (!ad) continue;
    const key = (ad.sopName || "BİLİNMEYEN_SOP").trim().toLowerCase();
    if (!sopGroupsMap.has(key)) {
      sopGroupsMap.set(key, []);
    }
    sopGroupsMap.get(key)!.push(report);
  }

  const mergedList: any[] = [];

  sopGroupsMap.forEach((reportsInGroup) => {
    if (reportsInGroup.length === 1) {
      mergedList.push(reportsInGroup[0].annualDetails);
    } else {
      const firstAd = reportsInGroup[0].annualDetails;
      const summaries = Array.from(new Set(reportsInGroup.map(r => r.annualDetails?.sopSummary).filter(Boolean)));

      const mergedAd = {
        sopName: firstAd.sopName,
        sopRefNo: firstAd.sopRefNo || reportsInGroup.find(r => r.annualDetails?.sopRefNo)?.annualDetails?.sopRefNo || "",
        reportPeriod: firstAd.reportPeriod || reportsInGroup.find(r => r.annualDetails?.reportPeriod)?.annualDetails?.reportPeriod || "",
        budget: firstAd.budget || reportsInGroup.find(r => r.annualDetails?.budget)?.annualDetails?.budget || 0,
        sopDuration: firstAd.sopDuration || reportsInGroup.find(r => r.annualDetails?.sopDuration)?.annualDetails?.sopDuration || "",
        sopSummary: summaries.join("\n\n"),
        components: [] as any[],
        resultIndicators: [] as any[],
        outputIndicators: [] as any[],
        milestones: [] as any[],
        evaluations: [] as any[],
        improvementSuggestions: [] as any[],
      };

      for (const r of reportsInGroup) {
        const ad = r.annualDetails;
        if (!ad) continue;
        if (Array.isArray(ad.components)) mergedAd.components.push(...ad.components);
        if (Array.isArray(ad.resultIndicators)) mergedAd.resultIndicators.push(...ad.resultIndicators);
        if (Array.isArray(ad.outputIndicators)) mergedAd.outputIndicators.push(...ad.outputIndicators);
        if (Array.isArray(ad.milestones)) mergedAd.milestones.push(...ad.milestones);
        if (Array.isArray(ad.evaluations)) mergedAd.evaluations.push(...ad.evaluations);
        if (Array.isArray(ad.improvementSuggestions)) mergedAd.improvementSuggestions.push(...ad.improvementSuggestions);
      }

      mergedList.push(mergedAd);
    }
  });

  return mergedList;
}

// -------------------------------------------------------------
// OPTION 1: Template Format (Basic, no colors, clean)
// -------------------------------------------------------------
export async function exportAnnualAsTemplate(reports: any[]) {
  if (!reports || reports.length === 0) return;
  const docConfig = await getDocSettings();

  // Group by unit
  const reportsByUnit: Record<string, any[]> = {};
  for (const r of reports) {
    if (!reportsByUnit[r.unit]) reportsByUnit[r.unit] = [];
    reportsByUnit[r.unit].push(r);
  }

  const sections: any[] = [];
  const unitKeys = Object.keys(reportsByUnit);

  for (let u = 0; u < unitKeys.length; u++) {
    const unit = unitKeys[u];
    const unitReports = reportsByUnit[unit];

    const reportChildren: any[] = [
      ...getCoverPage("YILLIK FAALİYET RAPORU", unit, docConfig),
    ];

    const mergedSops = groupAndMergeReportsBySop(unitReports);

    for (let i = 0; i < mergedSops.length; i++) {
      const ad = mergedSops[i];
      if (!ad) continue;

      if (i > 0) {
        reportChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));
      }

      reportChildren.push(
        new Paragraph({ text: `YILLIK ARA FAALİYET: ${ad.sopName}`, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Rapor Dönemi: ${ad.reportPeriod}`, spacing: { after: 200 } }),
        new Paragraph({ text: `Bütçe: ${ad.budget || '-'}`, spacing: { after: 200 } }),
        new Paragraph({ text: `Süre: ${ad.sopDuration || '-'}`, spacing: { after: 400 } }),
        new Paragraph({ text: "1. SOP Özeti", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: ad.sopSummary || "-", spacing: { after: 400 } }),
        new Paragraph({ text: "2. Bileşenler", heading: HeadingLevel.HEADING_2 }),
        createBasicTable(
          ["Bileşen Adı", "Durum", "Gecikme Nedeni", "İlerleme", "Sonraki Plan"],
          ad.components.map((c: any) => [c.name || c.componentName, c.status, c.delayReason, c.progress, c.nextPeriodPlan])
        ),
        new Paragraph({ text: "3. Sonuç Göstergeleri", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        createBasicTable(
          ["#", "Gösterge Adı", "Birim", "Başlangıç", "Hedef", "Dönem Değeri", "İlgili Amaç", "Hedef Dönem"],
          ad.resultIndicators.map((c: any, i: number) => [(i + 1).toString(), c.name, c.unit, c.initialValue, c.target, c.periodValue, c.relatedGoal, c.targetPeriod])
        ),
        new Paragraph({ text: "4. Çıktı Göstergeleri", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        createBasicTable(
          ["Gösterge", "Bileşen Kodu", "Birim", "Hedef", "Dönem Değeri", "Hedef Dönem"],
          ad.outputIndicators.map((c: any) => [c.name, c.componentCode, c.unit, c.target, c.periodValue, c.targetPeriod])
        ),
        new Paragraph({ text: "5. Kilometre Taşları", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        createBasicTable(
          ["Açıklama", "Bileşen Kodu", "Planlanan Tarih", "Gerçekleşme Tarihi"],
          ad.milestones.map((c: any) => [c.name, c.componentCode, c.plannedDate, c.actualDate])
        ),
        new Paragraph({ text: "6. Değerlendirme Raporları", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        createBasicTable(
          ["Bölüm", "Açıklama"],
          ad.evaluations.map((c: any) => [c.section, c.description])
        ),
        new Paragraph({ text: "7. İyileştirme Önerileri", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
        createBasicTable(
          ["Öğrenilen Ders", "Öneri", "İlgili SOP Alanı"],
          ad.improvementSuggestions.map((c: any) => [c.lessonLearned, c.suggestion, c.relatedSopArea])
        )
      );
    }

    sections.push({
      properties: {},
      children: reportChildren,
    });
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
    sections,
  });
  const blob = await Packer.toBlob(doc);
  const fileName = reports.length === 1
    ? `Yillik_Faaliyet_${reports[0].annualDetails.sopName}_Taslak.docx`
    : `Yillik_Faaliyet_Raporlari_Taslak.docx`;
  saveAs(blob, fileName);
}

// -------------------------------------------------------------
// OPTION 2: Designed Format
// -------------------------------------------------------------
export async function exportAnnualAsDesigned(reports: any[]) {
  if (!reports || reports.length === 0) return;
  const docConfig = await getDocSettings();

  // Group by unit
  const reportsByUnit: Record<string, any[]> = {};
  for (const r of reports) {
    if (!reportsByUnit[r.unit]) reportsByUnit[r.unit] = [];
    reportsByUnit[r.unit].push(r);
  }

  const sections: any[] = [];
  const unitKeys = Object.keys(reportsByUnit);

  for (let u = 0; u < unitKeys.length; u++) {
    const unit = unitKeys[u];
    const unitReports = reportsByUnit[unit];

    const reportChildren: any[] = [
      ...getCoverPage("2025 YILI FAALİYET RAPORU", unit, docConfig)
    ];

    const mergedSops = groupAndMergeReportsBySop(unitReports);

    for (let i = 0; i < mergedSops.length; i++) {
      const ad = mergedSops[i];
      if (!ad) continue;

      if (i > 0) {
        reportChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));
      }

      reportChildren.push(
        new Paragraph({ text: "3) " + (ad.sopName || "").replace(" SOP", ""), heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: "3.1. Genel Bilgiler", heading: HeadingLevel.HEADING_2 }),
        createVerticalInfoTable(ad),
        new Paragraph({ text: "3.2. Kapsam Takibi", heading: HeadingLevel.HEADING_2, pageBreakBefore: true }),
        createComponentTrackingTable(ad.components)
      );

      if (ad.resultIndicators && ad.resultIndicators.length > 0) {
        reportChildren.push(new Paragraph({ text: "3.3. Sonuç ve Çıktı Göstergeleri", heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
        reportChildren.push(new Paragraph({ text: "3.3.1. Sonuç Göstergeleri", heading: HeadingLevel.HEADING_2 }));
        reportChildren.push(createResultIndicatorsTable(ad.resultIndicators));
      }

      if (ad.outputIndicators && ad.outputIndicators.length > 0) {
        if (!ad.resultIndicators || ad.resultIndicators.length === 0) {
          reportChildren.push(new Paragraph({ text: "3.3. Sonuç ve Çıktı Göstergeleri", heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
        }
        reportChildren.push(new Paragraph({ text: "3.3.2. Çıktı Göstergeleri", heading: HeadingLevel.HEADING_2 }));
        reportChildren.push(createOutputIndicatorsTable(ad.outputIndicators));
      }

      if (ad.milestones && ad.milestones.length > 0) {
        reportChildren.push(new Paragraph({ text: "3.4. Kilometre Taşları", heading: HeadingLevel.HEADING_2 }));
        reportChildren.push(createMilestonesTable(ad.milestones));
      }

      if (ad.evaluations && ad.evaluations.length > 0) {
        reportChildren.push(new Paragraph({ text: "3.5. Değerlendirme Raporları", heading: HeadingLevel.HEADING_2 }));
        reportChildren.push(createDesignedTable(
          ["Bölüm", "Değerlendirmeler (Eksik Gerçekleşmeler, Sorunlar)"],
          ad.evaluations.map((c: any) => [c.section, c.description])
        ));
      }

      if (ad.improvementSuggestions && ad.improvementSuggestions.length > 0) {
        reportChildren.push(new Paragraph({ text: "3.6. İyileştirme Önerileri", heading: HeadingLevel.HEADING_2 }));
        reportChildren.push(createDesignedTable(
          ["#", "Çıkarılan Ders", "Önerilen İyileştirme", "İlgili SOP Yönetim Alanı"],
          ad.improvementSuggestions.map((c: any, i: number) => [(i + 1).toString(), c.lessonLearned, c.suggestion, c.relatedSopArea])
        ));
      }
    }

    sections.push({
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440,
          }
        }
      },
      children: reportChildren,
    });
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
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { color: "921d31", size: 48, bold: true, font: "Times New Roman" },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { color: "DA291C", size: 32, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { after: 200 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { color: "DA291C", size: 26, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
      ],
    },
    sections: sections,
  });

  const blob = await Packer.toBlob(doc);
  const fileName = reports.length === 1
    ? `Yillik_Faaliyet_${reports[0].annualDetails.sopName}_Tasarim.docx`
    : `Yillik_Faaliyet_Raporlari_Tasarim.docx`;
  saveAs(blob, fileName);
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

function createBasicTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: defaultBorders,
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, style: "Bold" })] })),
      }),
      ...rows.map(row => new TableRow({
        children: row.map(cell => new TableCell({ children: [new Paragraph({ text: cell || "-" })] }))
      }))
    ]
  });
}

function createDesignedTable(headers: string[], rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ children: [new TextRun({ text: h, color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER
        })),
      }),
      ...rows.map((row, idx) => new TableRow({
        children: row.map(cell => new TableCell({
          shading: { fill: idx % 2 === 0 ? "F5F5F5" : "EAEAEA", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ text: cell || "-" })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER
        }))
      }))
    ]
  });
}

function createVerticalInfoTable(ad: any) {
  const rowsData = [
    ["SOP Adı", ad.sopName],
    ["SOP Referans No", ad.sopRefNo],
    ["Rapor Dönemi", ad.reportPeriod],
    ["SOP Bütçesi", ad.budget ? ad.budget + " TL" : "-"],
    ["SOP Süresi", ad.sopDuration ? ad.sopDuration : "-"],
    ["SOP Özeti", ad.sopSummary]
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
    },
    rows: rowsData.map(([header, value], idx) => new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ children: [new TextRun({ text: header, color: "FFFFFF", bold: true })] })],
          margins: { top: 150, bottom: 150, left: 150, right: 150 },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ text: value || "-" })],
          margins: { top: 150, bottom: 150, left: 150, right: 150 },
          verticalAlign: VerticalAlign.CENTER
        })
      ]
    }))
  });
}

function createComponentTrackingTable(components: any[]) {
  const headerRow1 = new TableRow({
    height: { value: 400, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C" },
        children: [new Paragraph({ children: [new TextRun({ text: "Bileşen Adı", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        columnSpan: 4,
        shading: { fill: "DA291C" },
        children: [new Paragraph({ children: [new TextRun({ text: "Gerçekleşme Durumu", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C" },
        children: [new Paragraph({
          children: [
            new TextRun({ text: "Gecikme/", color: "FFFFFF", bold: true }),
            new TextRun({ text: "Gerçekleşmeme Nedeni", color: "FFFFFF", bold: true, break: 1 })
          ], alignment: AlignmentType.CENTER
        })],
        verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C" },
        children: [new Paragraph({ children: [new TextRun({ text: "Rapor Dönemindeki İlerlemeler", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }),
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C" },
        children: [new Paragraph({
          children: [
            new TextRun({ text: "Bir Sonraki Dönemde", color: "FFFFFF", bold: true }),
            new TextRun({ text: "Yapılacaklar", color: "FFFFFF", bold: true, break: 1 })
          ], alignment: AlignmentType.CENTER
        })],
        verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
      })
    ]
  });

  const headerRow2 = new TableRow({
    height: { value: 1200, rule: HeightRule.ATLEAST },
    children: [
      ["Zamanında", "Tamamlandı"],
      ["Gecikme ile", "Tamamlandı"],
      ["Devam", "Ediyor"],
      ["Başlamadı"]
    ].map(lines => new TableCell({
      shading: { fill: "DA291C" },
      textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
      children: [new Paragraph({
        children: lines.map((l, i) => new TextRun({ text: l, color: "FFFFFF", bold: true, size: 18, break: i > 0 ? 1 : 0 })),
        alignment: AlignmentType.CENTER
      })],
      verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 50, right: 50 }
    }))
  });

  const dataRows: TableRow[] = [];

  const groupedComponents = components.reduce((acc: any, c: any) => {
    const category = c.name || "DİĞER";
    if (!acc[category]) acc[category] = [];
    acc[category].push(c);
    return acc;
  }, {});

  Object.keys(groupedComponents).forEach((category) => {
    // Kategori Başlık Satırı (Tüm sütunları kaplayan)
    dataRows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 8,
          shading: { fill: "E6E6E6" },
          children: [new Paragraph({ children: [new TextRun({ text: category.toUpperCase(), bold: true })], alignment: AlignmentType.LEFT })],
          verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
        })
      ]
    }));

    // Kategoriye ait Bileşen Satırları
    groupedComponents[category].forEach((c: any, idx: number) => {
      const isZamaninda = c.status === "Zamanında Tamamlandı" || c.status === "zamaninda";
      const isGecikme = c.status === "Gecikme ile Tamamlandı" || c.status === "gecikme";
      const isDevam = c.status === "Devam Ediyor" || c.status === "devam";
      const isBaslamadi = c.status === "Başlamadı" || c.status === "baslamadi";

      dataRows.push(new TableRow({
        children: [
          c.componentName || "-",
          isZamaninda ? "X" : "",
          isGecikme ? "X" : "",
          isDevam ? "X" : "",
          isBaslamadi ? "X" : "",
          c.delayReason,
          c.progress,
          c.nextPeriodPlan
        ].map((val, cellIdx) => new TableCell({
          shading: { fill: idx % 2 === 0 ? "F5F5F5" : "EAEAEA" },
          children: [new Paragraph({ text: val || "", alignment: (cellIdx >= 1 && cellIdx <= 4) ? AlignmentType.CENTER : AlignmentType.LEFT })],
          verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }))
      }));
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1800, 400, 400, 400, 400, 2200, 2200, 2200],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
    },
    rows: [headerRow1, headerRow2, ...dataRows]
  });
}

function createResultIndicatorsTable(indicators: any[]) {
  return createDesignedTable(
    ["#", "Gösterge Adı", "Birim", "Başlangıç Değeri", "Planlanan Hedef", "Dönem Değeri", "İlgili Özel Amaç(lar) #", "Planlanan Tamamlanma Dönemi"],
    indicators.map((c: any, i: number) => [(i + 1).toString(), c.name, c.unit, c.initialValue, c.target, c.periodValue, c.relatedGoal, c.targetPeriod])
  );
}

function createOutputIndicatorsTable(indicators: any[]) {
  return createDesignedTable(
    ["Çıktı Göstergesi", "Bileşen Kodu", "Birim", "Planlanan Hedef", "Dönem Değeri", "Planlanan Tamamlanma Dönemi"],
    indicators.map((c: any) => [c.name, c.componentCode || "-", c.unit, c.target, c.periodValue, c.targetPeriod])
  );
}

function createMilestonesTable(milestones: any[]) {
  const headerRow1 = new TableRow({
    children: [
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: "#", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: "Eşik Noktasının Adı", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        rowSpan: 2,
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: "İlgili Bileşen Kodu", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        columnSpan: 2,
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Gerçekleşme Zamanı", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: "(Ay veya Dönem)", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })
        ],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });

  const headerRow2 = new TableRow({
    children: [
      new TableCell({
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: "Planlanan", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      }),
      new TableCell({
        shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: "Gerçekleşen", color: "FFFFFF", bold: true })], alignment: AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      })
    ]
  });

  const dataRows = milestones.map((c: any, i: number) => {
    return new TableRow({
      children: [
        (i + 1).toString(),
        c.name,
        c.componentCode,
        c.plannedDate || "-",
        c.actualDate || "-"
      ].map((cell, cellIndex) => new TableCell({
        shading: { fill: i % 2 === 0 ? "F5F5F5" : "EAEAEA", type: ShadingType.CLEAR, color: "auto" },
        children: [new Paragraph({ text: cell || "-", alignment: cellIndex === 1 || cellIndex === 2 ? AlignmentType.LEFT : AlignmentType.CENTER })],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.CENTER
      }))
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" },
    },
    rows: [headerRow1, headerRow2, ...dataRows]
  });
}

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, HeadingLevel, ShadingType, AlignmentType, VerticalAlign, PageOrientation } from "docx";
import { saveAs } from "file-saver";

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

function createSonucTable(activities: any[]) {
  const headers = ["Faaliyet", "Performans Göstergeleri", "Sonuç/Çıktı Göstergesi", "Ölçüm Birimi", "Hedef", "Doğrulama Kaynağı"];
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ children: [new TextRun({ text: h, color: "FFFFFF", bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER
        })),
      }),
      ...activities.map((act, idx) => new TableRow({
        children: [
          act.name || "-",
          act.performanceIndicator || "-",
          act.resultIndicator || "-",
          act.measurementUnit || "-",
          act.target || "-",
          act.verificationSource || "-"
        ].map(cell => new TableCell({
          shading: { fill: idx % 2 === 0 ? "F5F5F5" : "EAEAEA", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })] })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          verticalAlign: VerticalAlign.CENTER
        }))
      }))
    ]
  });
}

function createZamanTable(activities: any[], year: string) {
  const months = [1,2,3,4,5,6,7,8,9,10,11,12];
  
  const headerRow1 = new TableRow({
    children: [
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Faaliyet", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "İlgili Özel Amaç", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Sorumlu Birim", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Destek Birim", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Paydaşlar", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Bütçe Adı", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Bütçe Kodu", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ rowSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: "Bütçe Tutarı", color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ columnSpan: 12, margins: { top: 100, bottom: 100, left: 100, right: 100 }, shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: `${year} Yılı`, color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER })
    ]
  });

  const headerRow2 = new TableRow({
    children: months.map(m => new TableCell({
      shading: { fill: "DA291C", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: m.toString(), color: "FFFFFF", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
      verticalAlign: VerticalAlign.CENTER
    }))
  });

  const dataRows = activities.map((act, idx) => {
    const planned = act.plannedMonths || [];
    const baseCells = [
      act.name || "-",
      act.relatedGoal || "-",
      act.responsibleUnit || "-",
      act.supportUnit || "-",
      (act.stakeholders || []).join(", ") || "-",
      act.budgetName || "-",
      act.budgetCode || "-",
      act.budgetAmount || "-"
    ].map(cell => new TableCell({
      shading: { fill: idx % 2 === 0 ? "F5F5F5" : "EAEAEA", type: ShadingType.CLEAR, color: "auto" },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })], alignment: AlignmentType.CENTER })],
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      verticalAlign: VerticalAlign.CENTER
    }));

    const monthCells = months.map(m => new TableCell({
      shading: { fill: idx % 2 === 0 ? "F5F5F5" : "EAEAEA", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: planned.includes(m) ? "x" : "", size: 18, bold: true, color: "DA291C" })], alignment: AlignmentType.CENTER })],
      verticalAlign: VerticalAlign.CENTER
    }));

    return new TableRow({ children: [...baseCells, ...monthCells] });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1400, 1000, 1200, 1200, 1200, 1200, 800, 800, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
    },
    rows: [headerRow1, headerRow2, ...dataRows]
  });
}

export async function exportWorkProgramAsDesigned(programs: any | any[]) {
  const programsArray = Array.isArray(programs) ? programs : [programs];
  if (programsArray.length === 0) return;
  const docConfig = await getDocSettings();
  
  // Group by unit
  const programsByUnit: Record<string, any[]> = {};
  for (const p of programsArray) {
    if (!programsByUnit[p.unit]) programsByUnit[p.unit] = [];
    programsByUnit[p.unit].push(p);
  }

  const sections: any[] = [];
  const unitKeys = Object.keys(programsByUnit);

  for (let u = 0; u < unitKeys.length; u++) {
    const unit = unitKeys[u];
    const unitPrograms = programsByUnit[unit];

    const reportChildren: (Paragraph | Table)[] = [
      ...getCoverPage("ÇALIŞMA PROGRAMI", unit, docConfig),
    ];

    for (let i = 0; i < unitPrograms.length; i++) {
      const program = unitPrograms[i];
      if (i > 0) {
        reportChildren.push(new Paragraph({ text: "", pageBreakBefore: true }));
      }
      
      reportChildren.push(new Paragraph({ text: `${program.year} Yılı - ${program.name}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
    
      const rawActivities = program.activities || [];
      const activities: any[] = [];
      
      for (const act of rawActivities) {
        if (act.budgets && act.budgets.length > 0) {
          for (const budget of act.budgets) {
            activities.push({
              ...act,
              budgetCode: budget.code || "-",
              budgetName: budget.name || "-",
              budgetAmount: budget.amount || "-"
            });
          }
        } else {
          activities.push({
            ...act,
            budgetName: "-",
            budgetAmount: "-"
          });
        }
      }

      // Tablo 1: c. Sonuç ve Çıktı Hedefleri
      const activitiesWithResults = rawActivities.filter((a: any) => 
        a.performanceIndicator || a.resultIndicator || a.measurementUnit || a.target || a.verificationSource
      );

      if (activitiesWithResults.length > 0) {
        reportChildren.push(new Paragraph({ text: "c. Sonuç ve Çıktı Hedefleri", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        reportChildren.push(createSonucTable(activitiesWithResults));
        reportChildren.push(new Paragraph({ text: "", spacing: { after: 400 } }));
      }

      // Tablo 2: e. Program Süresi ve Zaman Planlaması
      reportChildren.push(new Paragraph({ text: "e. Program Süresi ve Zaman Planlaması", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      if (activities.length > 0) {
        reportChildren.push(createZamanTable(activities, program.year?.toString() || ""));
      } else {
        reportChildren.push(new Paragraph({ text: "Kayıt bulunamadı.", spacing: { after: 400 } }));
      }
      
      // Faaliyet Açıklaması
      if (program.description) {
        reportChildren.push(new Paragraph({ text: "f. Faaliyet Açıklaması", heading: HeadingLevel.HEADING_2, spacing: { before: 800, after: 200 } }));
        reportChildren.push(new Paragraph({ 
          text: program.description,
          spacing: { after: 400 }
        }));
      }
    }

    sections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
        }
      },
      children: reportChildren,
    });
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 },
          paragraph: { alignment: AlignmentType.JUSTIFIED },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { color: "DA291C", size: 28, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { color: "DA291C", size: 24, bold: true, font: "Times New Roman" },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
      ],
    },
    sections: sections,
  });

  const blob = await Packer.toBlob(doc);
  const fileName = programsArray.length === 1 
    ? `Calisma_Programi_${programsArray[0].year}_${programsArray[0].name}.docx`
    : `Toplu_Calisma_Programlari.docx`;
  saveAs(blob, fileName);
}

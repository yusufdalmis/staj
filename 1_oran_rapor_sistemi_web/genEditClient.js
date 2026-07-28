const fs = require('fs');

const srcPath = 'src/app/dashboard/rapor-giris/page.tsx';
const destPath = 'src/app/dashboard/raporlarim/[id]/EditReportClient.tsx';

let content = fs.readFileSync(srcPath, 'utf8');

// Replace standard exports and props
content = content.replace(
  'export default function RaporGirisPage() {',
  'export default function EditReportClient({ report }: { report: any }) {'
);

// We need to pass the initial values to useForm.
// Search for: const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, setValue } = useForm<ReportFormData>({
// and replace with our defaultValues setup.
const formSetupTarget = `const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, setValue } = useForm<ReportFormData>({
    defaultValues: {
      isAnnual: false,
      unit: "",
      subUnit: "",
      activities: [{ title: "", description: "", projectRefNo: "", programType: "", stakeholders: "", status: "", nextStep: "", photo1: "", photo2: "" }],
      components: [],
      resultIndicators: [],
      outputIndicators: [],
      milestones: [],
      evaluations: [],
      improvementSuggestions: []
    }
  })`;

const editFormSetup = `const { register, handleSubmit, control, watch, formState: { errors, isSubmitting }, setValue } = useForm<ReportFormData>({
    defaultValues: {
      isAnnual: report.isAnnual,
      unit: report.unit === "Kayseri YDO" || report.unit === "Sivas YDO" || report.unit === "Yozgat YDO" ? "Yatırım Destek Ofisi Faaliyetleri (YDO)" : report.unit,
      subUnit: report.unit === "Kayseri YDO" || report.unit === "Sivas YDO" || report.unit === "Yozgat YDO" ? report.unit : "",
      activities: report.activities?.length > 0 ? report.activities : [{ title: "", description: "", projectRefNo: "", programType: "", stakeholders: "", status: "", nextStep: "", photo1: "", photo2: "" }],
      sopName: report.annualDetails?.sopName || "",
      sopRefNo: report.annualDetails?.sopRefNo || "",
      reportPeriod: report.annualDetails?.reportPeriod || "",
      budget: report.annualDetails?.budget || "",
      sopDuration: report.annualDetails?.sopDuration || "",
      sopSummary: report.annualDetails?.sopSummary || "",
      components: report.annualDetails?.components || [],
      resultIndicators: report.annualDetails?.resultIndicators || [],
      outputIndicators: report.annualDetails?.outputIndicators || [],
      milestones: report.annualDetails?.milestones || [],
      evaluations: report.annualDetails?.evaluations || [],
      improvementSuggestions: report.annualDetails?.improvementSuggestions || []
    }
  })`;

content = content.replace(formSetupTarget, editFormSetup);

// Replace POST with PUT
content = content.replace('await fetch("/api/reports", {', 'await fetch(\`/api/reports/\${report.id}\`, {');
content = content.replace('method: "POST"', 'method: "PUT"');

// Replace "Yeni Faaliyet Girişi" title
content = content.replace(
  '<h1 className="text-2xl font-bold text-brand-dark">Yeni Faaliyet Girişi</h1>',
  '<h1 className="text-2xl font-bold text-brand-dark">Faaliyet Düzenle</h1>'
);
content = content.replace(
  '<p className="text-brand-dark/70 text-sm mt-1">Haftalık faaliyetlerinizi veya yıllık ara faaliyetlerinizi buradan sisteme girebilirsiniz.</p>',
  '<p className="text-brand-dark/70 text-sm mt-1">Raporunuzu buradan güncelleyebilirsiniz.</p>'
);

// Redirect to /dashboard/raporlarim/[id] instead of /dashboard/raporlarim
content = content.replace(
  'router.push("/dashboard/raporlarim")',
  'window.location.reload()'
);

// Fix unit logic for YDO because in edit it might not match
content = content.replace(
  'if (data.unit === "Yatırım Destek Ofisi Faaliyetleri (YDO)" && data.subUnit) {',
  'if (data.unit === "Yatırım Destek Ofisi Faaliyetleri (YDO)" && data.subUnit) {'
);

fs.writeFileSync(destPath, content);
console.log('EditReportClient generated.');

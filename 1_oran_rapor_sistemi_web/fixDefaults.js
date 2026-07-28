const fs = require('fs');
const file = 'src/app/dashboard/raporlarim/[id]/EditReportClient.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = /const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>\(\{[\s\S]*?defaultValues: \{[\s\S]*?\}\n  \}\)/;

const replacement = `const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      isAnnual: report.isAnnual || false,
      unit: report.unit === "Kayseri YDO" || report.unit === "Sivas YDO" || report.unit === "Yozgat YDO" ? "Yatırım Destek Ofisi Faaliyetleri (YDO)" : (report.unit || ""),
      subUnit: report.unit === "Kayseri YDO" || report.unit === "Sivas YDO" || report.unit === "Yozgat YDO" ? report.unit : "",
      activities: report.activities?.length > 0 ? report.activities : [{ title: "", description: "", projectRefNo: "", programType: "", stakeholders: "", status: "", nextStep: "", photo1: "", photo2: "" }],
      sopName: report.annualDetails?.sopName || "",
      sopRefNo: report.annualDetails?.sopRefNo || "",
      reportPeriod: report.annualDetails?.reportPeriod || "",
      budget: report.annualDetails?.budget || 0,
      sopDuration: report.annualDetails?.sopDuration || "",
      sopSummary: report.annualDetails?.sopSummary || "",
      components: report.annualDetails?.components?.length > 0 ? report.annualDetails.components : [],
      resultIndicators: report.annualDetails?.resultIndicators?.length > 0 ? report.annualDetails.resultIndicators : [],
      outputIndicators: report.annualDetails?.outputIndicators?.length > 0 ? report.annualDetails.outputIndicators : [],
      milestones: report.annualDetails?.milestones?.length > 0 ? report.annualDetails.milestones : [],
      evaluations: report.annualDetails?.evaluations?.length > 0 ? report.annualDetails.evaluations : [],
      improvementSuggestions: report.annualDetails?.improvementSuggestions?.length > 0 ? report.annualDetails.improvementSuggestions : []
    }
  })`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed defaultValues.');

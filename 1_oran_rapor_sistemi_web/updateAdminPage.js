const fs = require('fs');
const file = 'src/app/dashboard/admin/raporlar/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add EditReportClient import (needs to go up one level more because it's admin/raporlar/[id], whereas EditReportClient is in raporlarim/[id])
// Wait, EditReportClient is in `src/app/dashboard/raporlarim/[id]/EditReportClient.tsx`
// From `src/app/dashboard/admin/raporlar/[id]/page.tsx`, the path is `../../../raporlarim/[id]/EditReportClient`
content = 'import EditReportClient from "../../../raporlarim/[id]/EditReportClient"\n' + content;
content = content.replace('import { CheckCircle, XCircle, ArrowLeft, Calendar, FileText } from "lucide-react"', 'import { CheckCircle, XCircle, ArrowLeft, Calendar, FileText, Edit } from "lucide-react"');

// Fix signature
content = content.replace(
  'export default async function AdminRaporDetayPage({ params }: { params: Promise<{ id: string }> }) {',
  'export default async function AdminRaporDetayPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {'
);

// Read searchParams
content = content.replace(
  'const session = await getServerSession(authOptions)',
  'const resolvedSearchParams = await searchParams;\n  const isEdit = resolvedSearchParams.edit === "true";\n  const session = await getServerSession(authOptions)'
);

// If isEdit, render EditReportClient
const isEditCheck = `
  if (isEdit) {
    const rawSettings = await prisma.systemSetting.findMany();
    const lists = Object.fromEntries(rawSettings.map((s) => [s.key, JSON.parse(s.value)]));
    return <EditReportClient report={report} lists={lists} />;
  }
`;

content = content.replace(
  'if (!report) redirect("/dashboard/admin/raporlar")',
  'if (!report) redirect("/dashboard/admin/raporlar")\n' + isEditCheck
);

// Add 'Düzenle' button next to title
content = content.replace(
  '<h1 className="text-2xl font-bold text-brand-dark">Rapor Detayı</h1>',
  `<div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-brand-dark">Rapor Detayı</h1>
            <Link href={\`/dashboard/admin/raporlar/\${report.id}?edit=true\`} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg font-bold text-sm hover:bg-brand-primary hover:text-white transition-colors">
              <Edit size={16} /> Düzenle
            </Link>
          </div>`
);

fs.writeFileSync(file, content);
console.log('AdminRaporDetayPage updated.');

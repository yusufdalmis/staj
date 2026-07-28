const fs = require('fs');
const file = 'src/app/dashboard/raporlarim/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add EditReportClient import
content = 'import EditReportClient from "./EditReportClient"\n' + content;
content = content.replace('import { ArrowLeft, Calendar, FileText } from "lucide-react"', 'import { ArrowLeft, Calendar, FileText, Edit } from "lucide-react"');

// Fix signature
content = content.replace(
  'export default async function UserRaporDetayPage({ params }: { params: Promise<{ id: string }> }) {',
  'export default async function UserRaporDetayPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {'
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
  'if (!report || report.userId !== session.user.id) {\n    redirect("/dashboard/raporlarim")\n  }',
  'if (!report || report.userId !== session.user.id) {\n    redirect("/dashboard/raporlarim")\n  }\n' + isEditCheck
);

// Add 'Düzenle' button next to title
content = content.replace(
  '<h1 className="text-2xl font-bold text-brand-dark">Faaliyet Detayı</h1>',
  `<div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-brand-dark">Faaliyet Detayı</h1>
            <Link href={\`/dashboard/raporlarim/\${report.id}?edit=true\`} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg font-bold text-sm hover:bg-brand-primary hover:text-white transition-colors">
              <Edit size={16} /> Düzenle
            </Link>
          </div>`
);

fs.writeFileSync(file, content);
console.log('UserRaporDetayPage updated.');

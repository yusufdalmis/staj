import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import WorkProgramEditor from "@/components/reports/WorkProgramEditor"

export default async function ProgramDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const { id } = await params

  const program = await prisma.workProgram.findUnique({
    where: { id },
  })

  if (!program) {
    notFound()
  }

  return (
    <div className="animate-in fade-in pt-16 md:pt-4 pb-20">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-dark/5">
        <h1 className="text-2xl font-extrabold text-brand-dark mb-6 border-b border-brand-dark/10 pb-4">Çalışma Programı Düzenle</h1>
        <WorkProgramEditor programId={id} hideHeader={true} />
      </div>
    </div>
  )
}

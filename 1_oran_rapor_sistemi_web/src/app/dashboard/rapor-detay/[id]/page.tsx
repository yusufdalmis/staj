import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import ReportViewClient from "@/components/reports/ReportViewClient"

export default async function RaporDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      activities: true,
      annualDetails: {
        include: {
          components: true,
          resultIndicators: true,
          outputIndicators: true,
          milestones: true,
          evaluations: true,
          improvementSuggestions: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  })

  if (!report) {
    notFound()
  }

  return <ReportViewClient initialData={report} currentUserRole={session.user.role} currentUserId={session.user.id} />
}

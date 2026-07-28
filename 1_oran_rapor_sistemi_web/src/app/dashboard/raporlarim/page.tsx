import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import RaporlarimClient from "./RaporlarimClient"

export default async function RaporlarimPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) return null

  let reports: any[] = []
  try {
    reports = await prisma.report.findMany({
      where: { userId: session.user.id },
      include: {
        activities: true,
        annualDetails: true,
      },
      orderBy: { createdAt: "desc" }
    })
  } catch (error) {
    console.error("Failed to fetch reports:", error)
  }

  return <RaporlarimClient initialReports={reports} />
}

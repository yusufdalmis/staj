import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import CalismalarimClient from "./CalismalarimClient"

export default async function CalismalarimPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) return null

  let programs: any[] = []
  try {
    programs = await prisma.workProgram.findMany({
      include: {
        activities: true,
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { year: "desc" }
    })
  } catch (error) {
    console.error("Failed to fetch work programs:", error)
  }

  return <CalismalarimClient initialPrograms={programs} userRole={session.user.role} currentUserId={session.user.id} />
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let whereClause: any = {}
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.unit) {
       // Only allow seeing work programs belonging to the user's unit
       whereClause = { unit: session.user.unit }
    } else if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && !session.user.unit) {
       // User has no unit, they see nothing
       whereClause = { id: 'none' } 
    }

    const workPrograms = await prisma.workProgram.findMany({
      where: whereClause,
      orderBy: { year: 'desc' },
      include: {
        activities: true,
        user: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json(workPrograms)
  } catch (error) {
    console.error("Error fetching work programs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    const workProgram = await prisma.workProgram.findUnique({
      where: { id },
      include: {
        activities: true,
        user: {
          select: { name: true, email: true }
        }
      }
    })

    if (!workProgram) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // removed IDOR check allowing everyone to view

    return NextResponse.json(workProgram)
  } catch (error) {
    console.error("Error fetching work program details:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

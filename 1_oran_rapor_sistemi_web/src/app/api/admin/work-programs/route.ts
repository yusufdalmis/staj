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

    const workPrograms = await prisma.workProgram.findMany({
      orderBy: { year: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        _count: {
          select: {
            activities: true
          }
        }
      }
    })

    return NextResponse.json(workPrograms)
  } catch (error) {
    console.error("Error fetching work programs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, year, unit, description } = body

    if (!name || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const workProgram = await prisma.workProgram.create({
      data: {
        name,
        year: parseInt(year),
        unit,
        description,
        userId: session.user.id
      }
    })

    return NextResponse.json(workProgram, { status: 201 })
  } catch (error) {
    console.error("Error creating work program:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


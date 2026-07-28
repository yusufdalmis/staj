export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    const workProgram = await prisma.workProgram.findUnique({
      where: { id },
      include: {
        activities: true
      }
    })

    if (!workProgram) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(workProgram)
  } catch (error) {
    console.error("Error fetching work program details:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, year, unit, description, activities = [] } = body

    // We will use a transaction to safely update the program and its relations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update main program info
      const updatedProgram = await tx.workProgram.update({
        where: { id },
        data: {
          name,
          year: parseInt(year),
          unit,
          description
        }
      })

      // Helper function to sync nested arrays
      const syncNested = async (model: any, dataArray: any[], foreignKey: string) => {
        const existingIds = dataArray.filter(item => item.id).map(item => item.id)
        
        // Delete items that are not in the new array
        await model.deleteMany({
          where: {
            [foreignKey]: id,
            id: { notIn: existingIds }
          }
        })
        
        // Upsert items
        for (const item of dataArray) {
          const { id: itemId, _showResults, ...itemData } = item
          if (itemId) {
            await model.update({
              where: { id: itemId },
              data: itemData
            })
          } else {
            await model.create({
              data: {
                ...itemData,
                [foreignKey]: id
              }
            })
          }
        }
      }

      // Sync Activities
      await syncNested(tx.workProgramActivity, activities, 'workProgramId')

      return updatedProgram
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating work program:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    await prisma.workProgram.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting work program:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

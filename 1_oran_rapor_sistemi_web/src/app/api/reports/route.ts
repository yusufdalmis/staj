export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentLength = req.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload Too Large. Max 20MB." }, { status: 413 })
    }

    const data = await req.json()
    const { 
      isAnnual, 
      unit, 
      activities, 
      sopName, 
      sopRefNo, 
      reportPeriod, 
      budget, 
      sopDuration, 
      sopSummary, 
      components,
      resultIndicators,
      outputIndicators,
      milestones,
      evaluations,
      improvementSuggestions
    } = data

    const parsedIsAnnual = isAnnual === true || isAnnual === "true" || String(isAnnual).toLowerCase() === "on" || isAnnual === 1;

    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          userId: session.user.id,
          unit,
          isAnnual: parsedIsAnnual,
          status: "PENDING",
        }
      })

      // Add activities
      if (activities && activities.length > 0) {
        await tx.weeklyActivity.createMany({
          data: activities.map((act: { title?: string, description: string, projectRefNo?: string, programType?: string, stakeholders?: string[], status?: string, nextStep?: string, photo1?: string, photo2?: string }) => ({
            reportId: newReport.id,
            title: act.title || null,
            description: act.description,
            projectRefNo: act.projectRefNo || null,
            programType: act.programType || null,
            stakeholders: act.stakeholders || [],
            status: act.status || null,
            nextStep: act.nextStep || null,
            photo1: act.photo1 || null,
            photo2: act.photo2 || null
          }))
        })
      }

      // Helper to strip 'id' from react-hook-form field arrays
      const stripId = (arr: any[] | undefined) => {
        if (!arr || arr.length === 0) return undefined;
        return { create: arr.map(({ id, ...rest }) => rest) };
      };

      // Add annual details if applicable
      if (parsedIsAnnual) {
        await tx.annualDetails.create({
          data: {
            reportId: newReport.id,
            sopName,
            sopRefNo,
            reportPeriod,
            budget: budget ? parseFloat(budget) : null,
            sopDuration,
            sopSummary,
            components: stripId(components),
            resultIndicators: stripId(resultIndicators),
            outputIndicators: stripId(outputIndicators),
            milestones: stripId(milestones),
            evaluations: stripId(evaluations),
            improvementSuggestions: stripId(improvementSuggestions),
          }
        })
      }

      return newReport
    })

    const { logAction } = await import("@/lib/logger")
    await logAction("RAPOR_OLUSTURMA", { reportId: report.id, unit, isAnnual, sopName }, req, session.user.id)

    return NextResponse.json({ success: true, reportId: report.id })
  } catch (error) {
    console.error("Error creating report:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get("filter")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const unitFilter = searchParams.get("unit")
    const subUnitFilter = searchParams.get("subUnit")

    let whereClause: any = {}
    
    // Everyone can see all reports if filter=all is requested
    if (filter === "all") {
      whereClause = {}
    } else {
      whereClause = { userId: session.user.id }
    }

    // Apply date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = end
      }
    }

    // Apply unit filter
    if (unitFilter) {
      // If YDO is selected, and subUnit is selected, filter by subUnit
      if (unitFilter === "YatÄ±rÄ±m Destek Ofisi" && subUnitFilter) {
        whereClause.unit = subUnitFilter
      } else {
        // If YDO is selected but no subUnit, match any YDO (Kayseri, Sivas, Yozgat)
        // Wait, the actual units are "Kayseri YDO", "Sivas YDO", "Yozgat YDO". 
        // We can use contains for "YDO" if unitFilter is "YDO"
        if (unitFilter === "YatÄ±rÄ±m Destek Ofisi" || unitFilter === "YDO") {
          whereClause.unit = { contains: "YDO" }
        } else {
          whereClause.unit = unitFilter
        }
      }
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
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
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


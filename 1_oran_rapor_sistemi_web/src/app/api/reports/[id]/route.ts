export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentLength = req.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload Too Large. Max 20MB." }, { status: 413 })
    }

    const reportId = resolvedParams.id

    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
    })

    if (!existingReport) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    // Only allow edit if ADMIN, SUPER_ADMIN or creator
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && existingReport.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    await prisma.$transaction(async (tx) => {
      // 1. Delete existing activities
      await tx.weeklyActivity.deleteMany({ where: { reportId } })
      
      // 2. Delete existing annual details (if any). Since it's a 1-1, we check if it exists first.
      const existingAnnual = await tx.annualDetails.findUnique({ where: { reportId } })
      if (existingAnnual) {
        // Cascade delete will handle components, indicators, etc.
        await tx.annualDetails.delete({ where: { reportId } })
      }

      // 3. Update report base
      await tx.report.update({
        where: { id: reportId },
        data: {
          unit,
          isAnnual: parsedIsAnnual,
          updatedAt: new Date()
        }
      })

      // 4. Create new activities
      if (activities && activities.length > 0) {
        await tx.weeklyActivity.createMany({
          data: activities.map((act: any) => ({
            reportId,
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

      // 5. Create new annual details
      if (parsedIsAnnual) {
        await tx.annualDetails.create({
          data: {
            reportId,
            sopName,
            sopRefNo,
            reportPeriod,
            budget: budget ? parseFloat(budget) : null,
            sopDuration,
            sopSummary,
            components: components?.length ? { 
              create: components.map((c: any) => ({
                name: c.name,
                componentName: c.componentName,
                status: c.status,
                delayReason: c.delayReason,
                progress: c.progress,
                nextPeriodPlan: c.nextPeriodPlan,
              }))
            } : undefined,
            resultIndicators: resultIndicators?.length ? { 
              create: resultIndicators.map((r: any) => ({
                name: r.name,
                unit: r.unit,
                initialValue: r.initialValue,
                target: r.target,
                periodValue: r.periodValue,
                relatedGoal: r.relatedGoal,
                targetPeriod: r.targetPeriod,
              }))
            } : undefined,
            outputIndicators: outputIndicators?.length ? { 
              create: outputIndicators.map((o: any) => ({
                name: o.name,
                componentCode: o.componentCode,
                unit: o.unit,
                target: o.target,
                periodValue: o.periodValue,
                targetPeriod: o.targetPeriod,
              }))
            } : undefined,
            milestones: milestones?.length ? { 
              create: milestones.map((m: any) => ({
                name: m.name,
                componentCode: m.componentCode,
                plannedDate: m.plannedDate,
                actualDate: m.actualDate,
              }))
            } : undefined,
            evaluations: evaluations?.length ? { 
              create: evaluations.map((e: any) => ({
                section: e.section,
                description: e.description,
              }))
            } : undefined,
            improvementSuggestions: improvementSuggestions?.length ? { 
              create: improvementSuggestions.map((i: any) => ({
                lessonLearned: i.lessonLearned,
                suggestion: i.suggestion,
                relatedSopArea: i.relatedSopArea,
              }))
            } : undefined,
          }
        })
      }
    })

    const { logAction } = await import("@/lib/logger")
    await logAction("RAPOR_DUZENLEME", { reportId, unit, isAnnual }, req, session.user.id)

    return NextResponse.json({ success: true, reportId })
  } catch (error) {
    console.error("Error updating report:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const reportId = resolvedParams.id

    await prisma.report.delete({
      where: { id: reportId }
    })

    const { logAction } = await import("@/lib/logger")
    await logAction("RAPOR_SIL", { reportId }, req, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting report:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

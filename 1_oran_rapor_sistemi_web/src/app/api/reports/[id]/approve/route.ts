export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.report.update({
      where: { id: resolvedParams.id },
      data: { status: "APPROVED" }
    })

    // Redirect back to the report page
    return NextResponse.redirect(new URL(`/dashboard/admin/raporlar/${resolvedParams.id}`, req.url), 303)
  } catch (error) {
    console.error("Error approving report:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

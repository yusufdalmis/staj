export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const logs = await prisma.systemLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            unit: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 1000 // Limit to last 1000 logs to prevent massive queries, can implement pagination later if needed
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("GET Logs Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}


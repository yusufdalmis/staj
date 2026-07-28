export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/logger"
import { hash } from "bcryptjs"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        unit: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("GET Users Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { email, password, name, role, unit, isActive } = body

    if (!email || !password || !name) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return new NextResponse("User already exists", { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "USER",
        unit,
        isActive: isActive !== undefined ? isActive : true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        unit: true,
        isActive: true
      }
    })

    await logAction("KULLANICI_OLUSTURMA", { createdUserEmail: email, name, role }, req, session.user.id)

    return NextResponse.json(user)
  } catch (error) {
    console.error("POST User Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}


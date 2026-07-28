export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/logger"
import { hash } from "bcryptjs"

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, role, unit, isActive, password, email } = body

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return new NextResponse("User not found", { status: 404 })
    }

    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } })
      if (emailTaken) {
        return new NextResponse("Email already in use", { status: 400 })
      }
    }

    const dataToUpdate: any = {
      name,
      role,
      unit,
      isActive,
      email
    }

    // Update password only if provided
    if (password && password.trim() !== "") {
      dataToUpdate.password = await hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        unit: true,
        isActive: true
      }
    })

    await logAction("KULLANICI_GUNCELLEME", { 
      targetUserEmail: updatedUser.email, 
      changes: { name, role, unit, isActive, passwordChanged: !!password } 
    }, req, session.user.id)

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("PUT User Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  if (session.user.id === params.id) {
    return new NextResponse("Cannot delete yourself", { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return new NextResponse("User not found", { status: 404 })
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    await logAction("KULLANICI_SILME", { 
      targetUserEmail: existingUser.email
    }, req, session.user.id)

    return new NextResponse("OK")
  } catch (error) {
    console.error("DELETE User Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

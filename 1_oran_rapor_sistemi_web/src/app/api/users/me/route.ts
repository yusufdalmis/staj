export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAction } from "@/lib/logger"
import { hash } from "bcryptjs"

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email) {
      return new NextResponse("Email is required", { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!existingUser) {
      return new NextResponse("User not found", { status: 404 })
    }

    // If changing email, verify it's not taken by someone else
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })
      if (emailTaken) {
        return new NextResponse("Email already in use", { status: 400 })
      }
    }

    const dataToUpdate: any = {
      email
    }

    // Update password only if provided
    if (password && password.trim() !== "") {
      dataToUpdate.password = await hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    await logAction("PROFIL_GUNCELLEME", { 
      emailChanged: email !== existingUser.email,
      passwordChanged: !!password 
    }, req, session.user.id)

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("PUT /api/users/me Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}


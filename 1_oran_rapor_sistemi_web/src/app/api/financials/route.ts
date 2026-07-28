export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    
    // Ensure all numeric fields are correctly parsed, fallback to null or 0 where appropriate
    const financial = await prisma.financialData.upsert({
      where: {
        weekNumber_year: {
          weekNumber: data.weekNumber,
          year: data.year
        }
      },
      update: {
        genelHesap: data.genelHesap || 0,
        ozelHesap: data.ozelHesap || 0,
        kopSartliBagis: data.kopSartliBagis || null,
        sogepHesap: data.sogepHesap || null,
        cmdpHesap: data.cmdpHesap || null,
        uretenSehirler: data.uretenSehirler || null,
        sogreenHesap: data.sogreenHesap || null,
        abProjeHesap: data.abProjeHesap || null,
        toplamGelir: data.toplamGelir || null,
        toplamGider: data.toplamGider || null,
      },
      create: {
        weekNumber: data.weekNumber,
        year: data.year,
        genelHesap: data.genelHesap || 0,
        ozelHesap: data.ozelHesap || 0,
        kopSartliBagis: data.kopSartliBagis || null,
        sogepHesap: data.sogepHesap || null,
        cmdpHesap: data.cmdpHesap || null,
        uretenSehirler: data.uretenSehirler || null,
        sogreenHesap: data.sogreenHesap || null,
        abProjeHesap: data.abProjeHesap || null,
        toplamGelir: data.toplamGelir || null,
        toplamGider: data.toplamGider || null,
      }
    })

    return NextResponse.json({ success: true, financial })
  } catch (error) {
    console.error("Error saving financial data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


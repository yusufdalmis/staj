import { prisma } from "@/lib/prisma"

export async function logAction(action: string, details: any, req?: Request, userId?: string) {
  try {
    let ip = "Unknown"
    
    // Try to get IP from request
    if (req) {
      ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown"
    }

    // Try to stringify details
    let detailsString = ""
    if (typeof details === "string") {
      detailsString = details
    } else {
      try {
        detailsString = JSON.stringify(details)
      } catch (e) {
        detailsString = "Error stringifying details"
      }
    }

    await prisma.systemLog.create({
      data: {
        userId: userId || null,
        action,
        details: detailsString,
        ip
      }
    })
  } catch (error) {
    console.error("Error saving system log:", error)
    // We don't want logging errors to break the main application flow
  }
}

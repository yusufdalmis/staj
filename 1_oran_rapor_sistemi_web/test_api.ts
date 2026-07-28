import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const reports = await prisma.report.findMany({
    where: {},
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
  
  console.log(`Fetched ${reports.length} reports successfully!`)
}

main().catch(console.error).finally(() => prisma.$disconnect())

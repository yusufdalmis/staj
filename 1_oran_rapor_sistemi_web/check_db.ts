import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const reports = await prisma.report.findMany({
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
      }
    }
  })

  console.log(`Found ${reports.length} reports.`)
  for (const r of reports) {
    console.log(`Report ID: ${r.id}, isAnnual: ${r.isAnnual}`)
    if (r.isAnnual && r.annualDetails) {
      console.log(`  Components: ${r.annualDetails.components.length}`)
      console.log(`  Result Indicators: ${r.annualDetails.resultIndicators.length}`)
    }
    console.log(`  Activities: ${r.activities.length}`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })

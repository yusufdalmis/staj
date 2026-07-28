const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting to fill dummy data...");
  
  // fill ResultIndicators
  const resInds = await prisma.resultIndicator.findMany({ 
    where: { 
      OR: [
        { relatedGoal: null },
        { relatedGoal: '' }
      ]
    } 
  });
  console.log(`Found ${resInds.length} ResultIndicators to update.`);
  for (const r of resInds) {
    await prisma.resultIndicator.update({
      where: { id: r.id },
      data: {
        relatedGoal: 'Özel Amaç 1, 2, 3',
        targetPeriod: 'Aralık 2025'
      }
    });
  }

  // fill OutputIndicators
  const outInds = await prisma.outputIndicator.findMany({ 
    where: { 
      OR: [
        { targetPeriod: null },
        { targetPeriod: '' }
      ]
    } 
  });
  console.log(`Found ${outInds.length} OutputIndicators to update.`);
  for (const o of outInds) {
    await prisma.outputIndicator.update({
      where: { id: o.id },
      data: {
        targetPeriod: 'Aralık 2025'
      }
    });
  }

  // fill Milestones
  const milestones = await prisma.milestone.findMany({ 
    where: { 
      OR: [
        { componentCode: null },
        { componentCode: '' }
      ]
    } 
  });
  console.log(`Found ${milestones.length} Milestones to update.`);
  for (const m of milestones) {
    await prisma.milestone.update({
      where: { id: m.id },
      data: {
        componentCode: 'TR72 Verimlilik ve Rekabetçilik'
      }
    });
  }

  console.log("Dummy data filled successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

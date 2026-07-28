const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const settings = await prisma.systemSetting.findUnique({ where: { key: 'BUDGET_CODES' } });
  const budgetCodes = settings && settings.value ? JSON.parse(settings.value) : [];
  
  const activities = await prisma.workProgramActivity.findMany();
  let count = 0;
  for (const act of activities) {
    if (act.budgets && Array.isArray(act.budgets)) {
      let changed = false;
      const newBudgets = act.budgets.map((b) => {
        if (b.name && !b.code) {
          const match = budgetCodes.find((bc) => bc.includes(b.name));
          if (match) {
            b.code = match.split(' - ')[0];
            b.name = match.split(' - ').slice(1).join(' - ');
            changed = true;
          }
        }
        return b;
      });
      if (changed) {
        await prisma.workProgramActivity.update({
          where: { id: act.id },
          data: { budgets: newBudgets }
        });
        count++;
      }
    }
  }
  console.log('Fixed ' + count + ' activities');
}
fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

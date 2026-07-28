import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { key: 'BUDGET_CODES' } });
    const budgetCodes = settings ? JSON.parse(settings.value) : [];
    
    const activities = await prisma.workProgramActivity.findMany();
    let fixedCount = 0;
    
    for (const act of activities) {
      if (act.budgets && Array.isArray(act.budgets)) {
        let changed = false;
        const newBudgets = act.budgets.map((b: any) => {
          if (b.name && !b.code) {
            const match = budgetCodes.find((bc: string) => bc.includes(b.name));
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
          fixedCount++;
        }
      }
    }
    
    return NextResponse.json({ success: true, fixedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

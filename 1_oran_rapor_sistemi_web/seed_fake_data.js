const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No users found in database! Please create a user first.');
    return;
  }
  console.log(`Using user ${user.email} (${user.id}) for seeded data.`);

  // 1. Create 5 Weekly Reports
  for (let i = 1; i <= 5; i++) {
    await prisma.report.create({
      data: {
        userId: user.id,
        unit: 'Kayseri YDO',
        isAnnual: false,
        status: 'PENDING',
        activities: {
          create: [
            {
              title: `Haftalık Faaliyet ${i}`,
              description: `Bu ${i}. haftalık faaliyetin test açıklamasıdır.`,
              status: 'Tamamlandı',
              nextStep: 'Sonraki adım test',
              stakeholders: ['Paydaş A', 'Paydaş B'],
            }
          ]
        }
      }
    });
    console.log(`Created Weekly Report ${i}`);
  }

  // 2. Create 5 Weekly + Annual Reports
  for (let i = 1; i <= 5; i++) {
    await prisma.report.create({
      data: {
        userId: user.id,
        unit: 'Sivas YDO',
        isAnnual: true,
        status: 'PENDING',
        activities: {
          create: [
            {
              title: `Hem Haftalık Hem Yıllık Faaliyet ${i}`,
              description: `Bu ${i}. yıllık ve haftalık faaliyetin test açıklamasıdır.`,
              status: 'Devam Ediyor',
              nextStep: 'Raporlama yapılacak',
              stakeholders: ['Paydaş C'],
            }
          ]
        },
        annualDetails: {
          create: {
            sopName: 'SOP Test Adı',
            sopRefNo: `SOP-REF-${i}`,
            budget: 100000 + i * 1000,
            sopDuration: '1 Yıl 6 Ay',
            sopSummary: 'Test SOP Özeti',
            components: {
              create: [
                {
                  name: `Bileşen 1`,
                  status: 'Devam Ediyor',
                  progress: '50%'
                }
              ]
            }
          }
        }
      }
    });
    console.log(`Created Weekly+Annual Report ${i}`);
  }

  // 3. Create 5 Work Programs
  for (let i = 1; i <= 5; i++) {
    await prisma.workProgram.create({
      data: {
        userId: user.id,
        name: `2025 Test Çalışma Programı ${i}`,
        year: 2025,
        unit: 'Yozgat YDO',
        activities: {
          create: [
            {
              name: `Çalışma Programı Faaliyeti ${i}`,
              relatedGoal: 'Özel Amaç 1',
              responsibleUnit: 'Yozgat YDO',
              stakeholders: ['KOSGEB', 'İŞKUR'],
              budgets: [{ name: 'Bütçe Kalemi 1', code: '10.1', amount: '50000' }],
              plannedMonths: [1, 3, 5],
              performanceIndicator: 'Toplantı Sayısı',
              target: '5 Adet'
            }
          ]
        }
      }
    });
    console.log(`Created Work Program ${i}`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

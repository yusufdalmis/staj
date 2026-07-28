const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@oran.org.tr';
  const password = 'superadmin123';
  const name = 'Super Admin';
  const role = 'SUPER_ADMIN';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists, updating role and password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { role, password: hashedPassword }
    });
    console.log('Super admin updated.');
  } else {
    console.log('Creating new super admin user...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        isActive: true,
      }
    });
    console.log('Super admin created.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

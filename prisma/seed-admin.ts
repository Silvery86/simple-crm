import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ADMIN role...');
  
  // Create or update ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator with full access',
    },
  });

  console.log('✅ ADMIN role created:', adminRole);

  // Find admin user by email from environment
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (adminUser) {
      // Assign ADMIN role to user
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
      console.log(`✅ Assigned ADMIN role to user: ${adminEmail}`);
    } else {
      console.log(`⚠️  Admin user not found: ${adminEmail}`);
    }
  } else {
    console.log('⚠️  ADMIN_EMAIL not set in environment');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

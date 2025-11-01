/**
 * Prisma Seed Script
 * 
 * Purpose: Initialize database with default data (roles, etc)
 * 
 * Usage:
 * - Via npm: npm run seed
 * - Direct: npx ts-node prisma/seed.ts
 * 
 * This script runs before Prisma migrations on deployment
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// Define default roles
const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    description: 'Full system access. Can manage all users, stores, and system configurations.',
  },
  {
    name: 'MANAGER',
    description: 'Limited admin access. Can manage stores and team members within assigned scope.',
  },
  {
    name: 'PARTNER',
    description: 'Store-specific access. Can only manage their own store and data.',
  },
];

async function seedRoles() {
  console.log('  🔧 Seeding roles...');
  for (const roleData of DEFAULT_ROLES) {
    const existingRole = await db.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      console.log(`    ✓ Role "${roleData.name}" already exists (ID: ${existingRole.id})`);
    } else {
      const newRole = await db.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
        },
      });
      console.log(`    ✓ Created role "${newRole.name}" (ID: ${newRole.id})`);
    }
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  🌱 Database Seeding Started');
  console.log('========================================\n');

  try {
    await seedRoles();

    console.log('\n========================================');
    console.log('  ✅ All seeding completed successfully');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('  ❌ Seeding failed with error:');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Handle ESM module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Dynamically import the seed functions
// Using dynamic import to handle path resolution properly
async function importSeedFunctions() {
  try {
    // Construct the path to roles seed file
    const rolesPath = path.join(__dirname, '../src/lib/db/seed/roles.ts');
    
    // For development, we'll use direct Prisma client seeding
    const { PrismaClient } = await import('@prisma/client');
    return { PrismaClient };
  } catch (error) {
    console.error('Failed to import seed functions:', error);
    throw error;
  }
}

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

async function main() {
  console.log('\n========================================');
  console.log('  🌱 Database Seeding Started');
  console.log('========================================\n');

  try {
    const { PrismaClient } = await importSeedFunctions();
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

    // Seed roles
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

    await db.$disconnect();

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
  }
}

main();

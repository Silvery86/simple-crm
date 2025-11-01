import { db } from '@/lib/db';

/**
 * Purpose: Seed database with default roles for RBAC system
 * 
 * Roles:
 * - ADMIN: Full system access, manage all users and stores
 * - MANAGER: Limited admin access, manage stores and team members
 * - PARTNER: Store-specific access only, manage own store data
 */

interface RoleData {
  name: string;
  description: string;
}

const DEFAULT_ROLES: RoleData[] = [
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

/**
 * Seed roles into the database
 * - Checks if roles already exist before creating
 * - Uses upsert pattern to handle idempotent operations
 * - Logs created/skipped roles for debugging
 */
export async function seedRoles() {
  console.log('🌱 Starting role seeding...');

  try {
    for (const roleData of DEFAULT_ROLES) {
      const existingRole = await db.role.findUnique({
        where: { name: roleData.name },
      });

      if (existingRole) {
        console.log(`  ✓ Role "${roleData.name}" already exists (ID: ${existingRole.id})`);
      } else {
        const newRole = await db.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
          },
        });
        console.log(`  ✓ Created role "${newRole.name}" (ID: ${newRole.id})`);
      }
    }

    console.log('✅ Role seeding completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}

/**
 * Get or create a role by name
 * - Returns existing role if it exists
 * - Creates new role with description if not found
 * 
 * Usage:
 * ```typescript
 * const adminRole = await getOrCreateRole('ADMIN');
 * await userRepository.addRole(userId, adminRole.id);
 * ```
 */
export async function getOrCreateRole(roleName: string, description?: string) {
  const roleData = DEFAULT_ROLES.find(r => r.name === roleName);
  
  const role = await db.role.findUnique({
    where: { name: roleName },
  });

  if (role) {
    return role;
  }

  return await db.role.create({
    data: {
      name: roleName,
      description: description || roleData?.description,
    },
  });
}

/**
 * Clear all roles from database (use with caution!)
 * Warning: This will cascade delete user_roles references
 */
export async function clearRoles() {
  console.log('⚠️  Clearing all roles from database...');
  
  try {
    const deleted = await db.role.deleteMany();
    console.log(`  Deleted ${deleted.count} roles\n`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing roles:', error);
    throw error;
  }
}

/**
 * Reset roles to default state
 * - Clears existing roles
 * - Re-seeds default roles
 */
export async function resetRoles() {
  console.log('🔄 Resetting roles to default state...\n');
  
  try {
    await clearRoles();
    await seedRoles();
    console.log('✅ Roles reset completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Error resetting roles:', error);
    throw error;
  }
}

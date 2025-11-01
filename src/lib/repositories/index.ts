/**
 * Purpose: Repository Implementations export.
 */
export { UserRepository } from './implementations/user.repository';
export { RoleRepository } from './implementations/role.repository';

/**
 * Purpose: Repository Interfaces and Types export.
 */
export type { IUserRepository, UserWithRoles, CreateUserData, UpdateUserData, PaginationOptions, PaginatedResult } from './interfaces/user.interface';
export type { IRoleRepository, CreateRoleData, UpdateRoleData } from './interfaces/role.interface';

/**
 * Purpose: Factory pattern for creating repository instances with dependency injection.
 */
import { UserRepository } from './implementations/user.repository';
import { RoleRepository } from './implementations/role.repository';

/**
 * Purpose: Factory pattern để tạo repository instances.
 */
export class RepositoryFactory {
  private static userRepository: UserRepository;
  private static roleRepository: RoleRepository;

  /**
   * Purpose: Lấy User Repository instance (singleton).
   * Returns:
   *   - UserRepository — Instance của User Repository.
   */
  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  /**
   * Purpose: Lấy Role Repository instance (singleton).
   * Returns:
   *   - RoleRepository — Instance của Role Repository.
   */
  static getRoleRepository(): RoleRepository {
    if (!this.roleRepository) {
      this.roleRepository = new RoleRepository();
    }
    return this.roleRepository;
  }
}
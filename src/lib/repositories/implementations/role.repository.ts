import { db } from '@/lib/db';
import type { Role } from '@prisma/client';
import {
  IRoleRepository,
  CreateRoleData,
  UpdateRoleData,
} from '../interfaces/role.interface';

/**
 * Purpose: Role repository implementation sử dụng Prisma ORM.
 */
export class RoleRepository implements IRoleRepository {
  /**
   * Purpose: Tìm role theo ID.
   * Params:
   *   - id: string — ID của role.
   * Returns:
   *   - Promise<Role | null> — Role hoặc null nếu không tìm thấy.
   */
  async findById(id: string): Promise<Role | null> {
    return await db.role.findUnique({
      where: { id },
    });
  }

  /**
   * Purpose: Tìm role theo name.
   * Params:
   *   - name: string — Tên của role.
   * Returns:
   *   - Promise<Role | null> — Role hoặc null nếu không tìm thấy.
   */
  async findByName(name: string): Promise<Role | null> {
    return await db.role.findUnique({
      where: { name },
    });
  }

  /**
   * Purpose: Lấy tất cả roles.
   * Returns:
   *   - Promise<Role[]> — Danh sách tất cả roles.
   */
  async findAll(): Promise<Role[]> {
    return await db.role.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Purpose: Tạo role mới.
   * Params:
   *   - data: CreateRoleData — Dữ liệu để tạo role mới.
   * Returns:
   *   - Promise<Role> — Role vừa được tạo.
   */
  async create(data: CreateRoleData): Promise<Role> {
    return await db.role.create({
      data,
    });
  }

  /**
   * Purpose: Cập nhật role.
   * Params:
   *   - id: string — ID của role.
   *   - data: UpdateRoleData — Dữ liệu để cập nhật.
   * Returns:
   *   - Promise<Role> — Role sau khi được cập nhật.
   */
  async update(id: string, data: UpdateRoleData): Promise<Role> {
    return await db.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Purpose: Xóa role.
   * Params:
   *   - id: string — ID của role.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.role.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
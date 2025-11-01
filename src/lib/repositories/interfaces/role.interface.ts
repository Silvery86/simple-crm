import type { Role } from '@prisma/client';

/**
 * Purpose: Interface cho Role repository để tách biệt business logic khỏi database implementation.
 */
export interface IRoleRepository {
  /**
   * Purpose: Tìm role theo ID.
   * Params:
   *   - id: string — ID của role.
   * Returns:
   *   - Promise<Role | null> — Role hoặc null nếu không tìm thấy.
   */
  findById(id: string): Promise<Role | null>;

  /**
   * Purpose: Tìm role theo name.
   * Params:
   *   - name: string — Tên của role.
   * Returns:
   *   - Promise<Role | null> — Role hoặc null nếu không tìm thấy.
   */
  findByName(name: string): Promise<Role | null>;

  /**
   * Purpose: Lấy tất cả roles.
   * Returns:
   *   - Promise<Role[]> — Danh sách tất cả roles.
   */
  findAll(): Promise<Role[]>;

  /**
   * Purpose: Tạo role mới.
   * Params:
   *   - data: CreateRoleData — Dữ liệu để tạo role mới.
   * Returns:
   *   - Promise<Role> — Role vừa được tạo.
   */
  create(data: CreateRoleData): Promise<Role>;

  /**
   * Purpose: Cập nhật role.
   * Params:
   *   - id: string — ID của role.
   *   - data: UpdateRoleData — Dữ liệu để cập nhật.
   * Returns:
   *   - Promise<Role> — Role sau khi được cập nhật.
   */
  update(id: string, data: UpdateRoleData): Promise<Role>;

  /**
   * Purpose: Xóa role.
   * Params:
   *   - id: string — ID của role.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  delete(id: string): Promise<boolean>;
}

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}
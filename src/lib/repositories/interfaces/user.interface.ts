import type { User, Role, UserRole } from '@prisma/client';

/**
 * Purpose: Interface cho User repository để tách biệt business logic khỏi database implementation.
 */
export interface IUserRepository {
  /**
   * Purpose: Tìm user theo ID.
   * Params:
   *   - id: string — ID của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  findById(id: string): Promise<UserWithRoles | null>;

  /**
   * Purpose: Tìm user theo email.
   * Params:
   *   - email: string — Email của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  findByEmail(email: string): Promise<UserWithRoles | null>;

  /**
   * Purpose: Tìm user theo Firebase UID.
   * Params:
   *   - firebaseUid: string — Firebase UID của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  findByFirebaseUid(firebaseUid: string): Promise<UserWithRoles | null>;

  /**
   * Purpose: Tạo user mới.
   * Params:
   *   - data: CreateUserData — Dữ liệu để tạo user mới.
   * Returns:
   *   - Promise<UserWithRoles> — User vừa được tạo với roles.
   */
  create(data: CreateUserData): Promise<UserWithRoles>;

  /**
   * Purpose: Cập nhật user.
   * Params:
   *   - id: string — ID của user.
   *   - data: UpdateUserData — Dữ liệu để cập nhật.
   * Returns:
   *   - Promise<UserWithRoles> — User sau khi được cập nhật.
   */
  update(id: string, data: UpdateUserData): Promise<UserWithRoles>;

  /**
   * Purpose: Xóa user.
   * Params:
   *   - id: string — ID của user.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Purpose: Thêm role cho user.
   * Params:
   *   - userId: string — ID của user.
   *   - roleId: string — ID của role.
   * Returns:
   *   - Promise<UserRole> — UserRole relation vừa được tạo.
   */
  addRole(userId: string, roleId: string): Promise<UserRole>;

  /**
   * Purpose: Xóa role khỏi user.
   * Params:
   *   - userId: string — ID của user.
   *   - roleId: string — ID của role.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  removeRole(userId: string, roleId: string): Promise<boolean>;

  /**
   * Purpose: Lấy danh sách users với pagination.
   * Params:
   *   - options: PaginationOptions — Tùy chọn phân trang.
   * Returns:
   *   - Promise<PaginatedResult<UserWithRoles>> — Kết quả có phân trang.
   */
  findMany(options: PaginationOptions): Promise<PaginatedResult<UserWithRoles>>;
}

export type UserWithRoles = User & {
  userRoles: (UserRole & {
    role: Role;
  })[];
};

export interface CreateUserData {
  email: string;
  name: string;
  firebaseUid: string;
  roleIds?: string[];
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
  roleId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
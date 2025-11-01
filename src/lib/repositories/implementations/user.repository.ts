import { db } from '@/lib/db';
import type { UserRole } from '@prisma/client';
import {
  IUserRepository,
  UserWithRoles,
  CreateUserData,
  UpdateUserData,
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/user.interface';

/**
 * Purpose: User repository implementation sử dụng Prisma ORM.
 */
export class UserRepository implements IUserRepository {
  /**
   * Purpose: Tìm user theo ID.
   * Params:
   *   - id: string — ID của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  async findById(id: string): Promise<UserWithRoles | null> {
    return await db.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: Tìm user theo email.
   * Params:
   *   - email: string — Email của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return await db.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: Tìm user theo Firebase UID.
   * Params:
   *   - firebaseUid: string — Firebase UID của user.
   * Returns:
   *   - Promise<UserWithRoles | null> — User với roles hoặc null nếu không tìm thấy.
   */
  async findByFirebaseUid(firebaseUid: string): Promise<UserWithRoles | null> {
    return await db.user.findUnique({
      where: { firebaseUid },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: Tạo user mới.
   * Params:
   *   - data: CreateUserData — Dữ liệu để tạo user mới.
   * Returns:
   *   - Promise<UserWithRoles> — User vừa được tạo với roles.
   */
  async create(data: CreateUserData): Promise<UserWithRoles> {
    return await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        firebaseUid: data.firebaseUid,
        userRoles: data.roleIds
          ? {
              create: data.roleIds.map((roleId) => ({
                roleId,
              })),
            }
          : undefined,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: Cập nhật user.
   * Params:
   *   - id: string — ID của user.
   *   - data: UpdateUserData — Dữ liệu để cập nhật.
   * Returns:
   *   - Promise<UserWithRoles> — User sau khi được cập nhật.
   */
  async update(id: string, data: UpdateUserData): Promise<UserWithRoles> {
    return await db.user.update({
      where: { id },
      data,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: Xóa user.
   * Params:
   *   - id: string — ID của user.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await db.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Purpose: Thêm role cho user.
   * Params:
   *   - userId: string — ID của user.
   *   - roleId: string — ID của role.
   * Returns:
   *   - Promise<UserRole> — UserRole relation vừa được tạo.
   */
  async addRole(userId: string, roleId: string): Promise<UserRole> {
    return await db.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Purpose: Xóa role khỏi user.
   * Params:
   *   - userId: string — ID của user.
   *   - roleId: string — ID của role.
   * Returns:
   *   - Promise<boolean> — True nếu xóa thành công.
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      await db.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Purpose: Lấy danh sách users với pagination.
   * Params:
   *   - options: PaginationOptions — Tùy chọn phân trang.
   * Returns:
   *   - Promise<PaginatedResult<UserWithRoles>> — Kết quả có phân trang.
   */
  async findMany(options: PaginationOptions): Promise<PaginatedResult<UserWithRoles>> {
    const { page, limit, search, roleId } = options;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(roleId && {
        userRoles: {
          some: {
            roleId,
          },
        },
      }),
    };

    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
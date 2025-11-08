import { prisma } from '../client';
import type { Store, Prisma } from '@prisma/client';

/**
 * Purpose: Define the Store repository interface for database operations.
 * Responsibility: Provides type-safe methods for Store CRUD operations.
 */
export interface StoreRepository {
  /**
   * Purpose: Find a store by its unique identifier.
   * Params:
   *   - id: string — The store identifier.
   * Returns:
   *   - Promise<Store | null> — The store or null if not found.
   */
  findById(id: string): Promise<Store | null>;

  /**
   * Purpose: Find a store by domain.
   * Params:
   *   - domain: string — The store domain.
   * Returns:
   *   - Promise<Store | null> — The store or null if not found.
   */
  findByDomain(domain: string): Promise<Store | null>;

  /**
   * Purpose: List stores with filtering and pagination.
   * Params:
   *   - params: ListStoresParams — Filter and pagination parameters.
   * Returns:
   *   - Promise<PaginatedResult<Store>> — Paginated store results.
   */
  list(params: ListStoresParams): Promise<PaginatedResult<Store>>;

  /**
   * Purpose: Create a new store with validated data.
   * Params:
   *   - data: CreateStoreInput — The store creation data.
   * Returns:
   *   - Promise<Store> — The created store with generated fields.
   * Throws:
   *   - Error — When validation fails or database constraint violation.
   */
  create(data: CreateStoreInput): Promise<Store>;

  /**
   * Purpose: Update an existing store with partial data.
   * Params:
   *   - id: string — The store identifier.
   *   - data: UpdateStoreInput — Partial update data.
   * Returns:
   *   - Promise<Store> — The updated store.
   * Throws:
   *   - Error — When store not found or validation fails.
   */
  update(id: string, data: UpdateStoreInput): Promise<Store>;

  /**
   * Purpose: Hard delete a store.
   * Params:
   *   - id: string — The store identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When store not found.
   */
  delete(id: string): Promise<void>;
}

export interface ListStoresParams {
  page?: number;
  limit?: number;
  platform?: string;
  status?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type CreateStoreInput = Omit<Store, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStoreInput = Partial<CreateStoreInput>;

/**
 * Purpose: Prisma implementation of Store repository interface.
 * Responsibility: Handles all database operations for Store model using Prisma client.
 */
class PrismaStoreRepository implements StoreRepository {
  /**
   * Purpose: Find a store by its unique identifier.
   * Params:
   *   - id: string — The store identifier.
   * Returns:
   *   - Promise<Store | null> — The store or null if not found.
   */
  async findById(id: string): Promise<Store | null> {
    return prisma.store.findUnique({
      where: { id },
    });
  }

  /**
   * Purpose: Find a store by domain.
   * Params:
   *   - domain: string — The store domain.
   * Returns:
   *   - Promise<Store | null> — The store or null if not found.
   */
  async findByDomain(domain: string): Promise<Store | null> {
    return prisma.store.findFirst({
      where: { domain },
    });
  }

  /**
   * Purpose: List stores with filtering and pagination.
   * Params:
   *   - params: ListStoresParams — Filter and pagination parameters.
   * Returns:
   *   - Promise<PaginatedResult<Store>> — Paginated store results.
   */
  async list(params: ListStoresParams): Promise<PaginatedResult<Store>> {
    const { page = 1, limit = 20, platform, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {
      ...(platform && { platform: platform as any }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.store.count({ where }),
    ]);

    return {
      data: stores,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Purpose: Create a new store with validated data.
   * Params:
   *   - data: CreateStoreInput — The store creation data.
   * Returns:
   *   - Promise<Store> — The created store with generated fields.
   * Throws:
   *   - Error — When validation fails or database constraint violation.
   */
  async create(data: CreateStoreInput): Promise<Store> {
    return prisma.store.create({
      data: data as any,
    });
  }

  /**
   * Purpose: Update an existing store with partial data.
   * Params:
   *   - id: string — The store identifier.
   *   - data: UpdateStoreInput — Partial update data.
   * Returns:
   *   - Promise<Store> — The updated store.
   * Throws:
   *   - Error — When store not found or validation fails.
   */
  async update(id: string, data: UpdateStoreInput): Promise<Store> {
    return prisma.store.update({
      where: { id },
      data: data as any,
    });
  }

  /**
   * Purpose: Delete a store (hard delete).
   * Params:
   *   - id: string — The store identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When store not found.
   */
  async delete(id: string): Promise<void> {
    await prisma.store.delete({
      where: { id },
    });
  }
}

/**
 * Purpose: Export singleton instance of Store repository.
 * Exports: storeRepository — The default store repository instance.
 */
export const storeRepository = new PrismaStoreRepository();

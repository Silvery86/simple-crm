/**
 * Store Product Map Repository
 * 
 * Purpose: Handle database operations for store-product mappings
 * Location: src/lib/db/repositories/store-product-map.repo.ts
 */

import { prisma } from '@/lib/db/client';
import { StoreProductMap, Prisma } from '@prisma/client';

export type CreateStoreProductMapInput = Omit<StoreProductMap, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateStoreProductMapInput = Partial<CreateStoreProductMapInput>;

/**
 * Purpose: Repository interface for StoreProductMap operations.
 */
export interface IStoreProductMapRepository {
  /**
   * Purpose: Find mapping by store and product IDs.
   * Params:
   *   - storeId: string — Store ID.
   *   - productId: string — Product ID.
   * Returns:
   *   - Promise<StoreProductMap | null> — Mapping if found.
   */
  findByStoreAndProduct(storeId: string, productId: string): Promise<StoreProductMap | null>;

  /**
   * Purpose: Get all mappings for a store with pagination.
   * Params:
   *   - storeId: string — Store ID.
   *   - options: Object — Pagination and filter options.
   * Returns:
   *   - Promise<{mappings: StoreProductMap[], total: number}> — Paginated mappings.
   */
  findByStore(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      isActive?: boolean;
      include?: Prisma.StoreProductMapInclude;
      orderBy?: Prisma.StoreProductMapOrderByWithRelationInput;
    }
  ): Promise<{ mappings: any[]; total: number }>;

  /**
   * Purpose: Get all mappings for a product across stores.
   * Params:
   *   - productId: string — Product ID.
   *   - include: Prisma.StoreProductMapInclude — Include relations.
   * Returns:
   *   - Promise<StoreProductMap[]> — All mappings for product.
   */
  findByProduct(productId: string, include?: Prisma.StoreProductMapInclude): Promise<any[]>;

  /**
   * Purpose: Create new store-product mapping.
   * Params:
   *   - data: CreateStoreProductMapInput — Mapping data.
   * Returns:
   *   - Promise<StoreProductMap> — Created mapping.
   */
  create(data: CreateStoreProductMapInput): Promise<StoreProductMap>;

  /**
   * Purpose: Update existing mapping.
   * Params:
   *   - storeId: string — Store ID.
   *   - productId: string — Product ID.
   *   - data: UpdateStoreProductMapInput — Update data.
   * Returns:
   *   - Promise<StoreProductMap | null> — Updated mapping.
   */
  update(
    storeId: string,
    productId: string,
    data: UpdateStoreProductMapInput
  ): Promise<StoreProductMap | null>;

  /**
   * Purpose: Delete mapping.
   * Params:
   *   - storeId: string — Store ID.
   *   - productId: string — Product ID.
   * Returns:
   *   - Promise<boolean> — True if deleted.
   */
  delete(storeId: string, productId: string): Promise<boolean>;
}

/**
 * Purpose: Prisma implementation of StoreProductMap repository.
 */
export class PrismaStoreProductMapRepository implements IStoreProductMapRepository {
  /**
   * Purpose: Find mapping by store and product IDs.
   */
  async findByStoreAndProduct(storeId: string, productId: string): Promise<StoreProductMap | null> {
    return await prisma.storeProductMap.findFirst({
      where: {
        storeId,
        productId
      }
    });
  }

  /**
   * Purpose: Get all mappings for a store with pagination.
   */
  async findByStore(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      isActive?: boolean;
      include?: Prisma.StoreProductMapInclude;
      orderBy?: Prisma.StoreProductMapOrderByWithRelationInput;
    }
  ): Promise<{ mappings: any[]; total: number }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.StoreProductMapWhereInput = {
      storeId
    };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    // Default orderBy if not provided
    const orderBy: Prisma.StoreProductMapOrderByWithRelationInput | Prisma.StoreProductMapOrderByWithRelationInput[] = 
      options?.orderBy || [
        { displayOrder: 'asc' as Prisma.SortOrder },
        { createdAt: 'desc' as Prisma.SortOrder }
      ];

    const [mappings, total] = await Promise.all([
      prisma.storeProductMap.findMany({
        where,
        include: options?.include,
        orderBy,
        skip,
        take: pageSize
      }),
      prisma.storeProductMap.count({ where })
    ]);

    return { mappings, total };
  }

  /**
   * Purpose: Get all mappings for a product across stores.
   */
  async findByProduct(productId: string, include?: Prisma.StoreProductMapInclude): Promise<any[]> {
    return await prisma.storeProductMap.findMany({
      where: { productId },
      include
    });
  }

  /**
   * Purpose: Create new store-product mapping.
   */
  async create(data: CreateStoreProductMapInput): Promise<StoreProductMap> {
    return await prisma.storeProductMap.create({
      data: data as any
    });
  }

  /**
   * Purpose: Update existing mapping.
   */
  async update(
    storeId: string,
    productId: string,
    data: UpdateStoreProductMapInput
  ): Promise<StoreProductMap | null> {
    // First check if mapping exists
    const existing = await this.findByStoreAndProduct(storeId, productId);
    if (!existing) {
      return null;
    }

    return await prisma.storeProductMap.update({
      where: {
        storeId_productId: {
          storeId,
          productId
        }
      },
      data: data as Prisma.StoreProductMapUpdateInput
    });
  }

  /**
   * Purpose: Delete mapping.
   */
  async delete(storeId: string, productId: string): Promise<boolean> {
    try {
      await prisma.storeProductMap.delete({
        where: {
          storeId_productId: {
            storeId,
            productId
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const storeProductMapRepository = new PrismaStoreProductMapRepository();

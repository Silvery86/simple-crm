import { prisma } from '../client';
import type { Product, Prisma } from '@prisma/client';

/**
 * Purpose: Define the Product repository interface for database operations.
 * Responsibility: Provides type-safe methods for Product CRUD operations.
 */
export interface ProductRepository {
  /**
   * Purpose: Find a product by its unique identifier.
   * Params:
   *   - id: string — The product identifier.
   * Returns:
   *   - Promise<ProductWithRelations | null> — The product with brand and variants, or null if not found.
   */
  findById(id: string): Promise<ProductWithRelations | null>;

  /**
   * Purpose: List products with filtering and pagination.
   * Params:
   *   - params: ListProductsParams — Filter and pagination parameters.
   * Returns:
   *   - Promise<PaginatedResult<ProductWithRelations>> — Paginated product results.
   */
  list(params: ListProductsParams): Promise<PaginatedResult<ProductWithRelations>>;

  /**
   * Purpose: Create a new product with validated data.
   * Params:
   *   - data: CreateProductInput — The product creation data.
   * Returns:
   *   - Promise<Product> — The created product with generated fields.
   * Throws:
   *   - Error — When validation fails or database constraint violation.
   */
  create(data: CreateProductInput): Promise<Product>;

  /**
   * Purpose: Update an existing product with partial data.
   * Params:
   *   - id: string — The product identifier.
   *   - data: UpdateProductInput — Partial update data.
   * Returns:
   *   - Promise<Product> — The updated product.
   * Throws:
   *   - Error — When product not found or validation fails.
   */
  update(id: string, data: UpdateProductInput): Promise<Product>;

  /**
   * Purpose: Hard delete a product.
   * Params:
   *   - id: string — The product identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When product not found.
   */
  delete(id: string): Promise<void>;

  /**
   * Purpose: Find products by brand identifier.
   * Params:
   *   - brandId: string — The brand identifier.
   * Returns:
   *   - Promise<Product[]> — Array of products for the brand.
   */
  findByBrand(brandId: string): Promise<Product[]>;

  /**
   * Purpose: Find products by store identifier through StoreProductMap.
   * Params:
   *   - storeId: string — The store identifier.
   * Returns:
   *   - Promise<ProductWithRelations[]> — Array of products for the store.
   */
  findByStore(storeId: string): Promise<ProductWithRelations[]>;
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  brandId?: string;
  storeId?: string;
  search?: string;
  isShared?: boolean;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
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

export type ProductWithRelations = Product & {
  brand: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    sku: string | null;
    price: any;
    currency: string | null;
  }>;
  _count?: {
    maps: number;
  };
};

// Temporary type extension until Prisma Client is regenerated
export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & {
  handle?: string | null;
  vendor?: string | null;
  options?: any;
  isShared?: boolean;
  categories?: string[];
  images?: string[];
};
export type UpdateProductInput = Partial<CreateProductInput>;

/**
 * Purpose: Prisma implementation of Product repository interface.
 * Responsibility: Handles all database operations for Product model using Prisma client.
 */
class PrismaProductRepository implements ProductRepository {
  /**
   * Purpose: Find a product by its unique identifier with relations.
   * Params:
   *   - id: string — The product identifier.
   * Returns:
   *   - Promise<ProductWithRelations | null> — The product with relations or null if not found.
   */
  async findById(id: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            currency: true,
          },
        },
        _count: {
          select: {
            maps: true,
          },
        },
      },
    });
  }

  /**
   * Purpose: List products with filtering and pagination.
   * Params:
   *   - params: ListProductsParams — Filter and pagination parameters.
   * Returns:
   *   - Promise<PaginatedResult<ProductWithRelations>> — Paginated product results.
   */
  async list(params: ListProductsParams): Promise<PaginatedResult<ProductWithRelations>> {
    const { page = 1, limit = 20, brandId, storeId, search, isShared, categories, minPrice, maxPrice } = params;
    const skip = (page - 1) * limit;

    // Cast to any until Prisma Client is regenerated with new schema fields
    const where: any = {
      ...(brandId && { brandId }),
      ...(isShared !== undefined && { isShared }),
      ...(categories && categories.length > 0 && {
        categories: {
          hasSome: categories,
        },
      }),
      ...(storeId && {
        maps: {
          some: {
            storeId,
          },
        },
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        variants: {
          some: {
            AND: [
              ...(minPrice !== undefined ? [{ price: { gte: minPrice } }] : []),
              ...(maxPrice !== undefined ? [{ price: { lte: maxPrice } }] : []),
            ],
          },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              currency: true,
            },
          },
          _count: {
            select: {
              maps: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Purpose: Create a new product with validated data.
   * Params:
   *   - data: CreateProductInput — The product creation data.
   * Returns:
   *   - Promise<Product> — The created product with generated fields.
   * Throws:
   *   - Error — When validation fails or database constraint violation.
   */
  async create(data: CreateProductInput): Promise<Product> {
    return prisma.product.create({
      data: data as any,
    });
  }

  /**
   * Purpose: Update an existing product with partial data.
   * Params:
   *   - id: string — The product identifier.
   *   - data: UpdateProductInput — Partial update data.
   * Returns:
   *   - Promise<Product> — The updated product.
   * Throws:
   *   - Error — When product not found or validation fails.
   */
  async update(id: string, data: UpdateProductInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: data as any,
    });
  }

  /**
   * Purpose: Hard delete a product.
   * Params:
   *   - id: string — The product identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When product not found.
   */
  async delete(id: string): Promise<void> {
    await prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Purpose: Find products by brand identifier.
   * Params:
   *   - brandId: string — The brand identifier.
   * Returns:
   *   - Promise<Product[]> — Array of products for the brand.
   */
  async findByBrand(brandId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Purpose: Find products by store identifier through StoreProductMap.
   * Params:
   *   - storeId: string — The store identifier.
   * Returns:
   *   - Promise<ProductWithRelations[]> — Array of products for the store.
   */
  async findByStore(storeId: string): Promise<ProductWithRelations[]> {
    return prisma.product.findMany({
      where: {
        maps: {
          some: {
            storeId,
          },
        },
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            currency: true,
          },
        },
        _count: {
          select: {
            maps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

/**
 * Purpose: Export singleton instance of Product repository.
 * Exports: productRepository — The default product repository instance.
 */
export const productRepository = new PrismaProductRepository();

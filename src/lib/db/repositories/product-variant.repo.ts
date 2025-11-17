import { prisma } from '../client';
import { ProductVariant, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Purpose: Define the ProductVariant repository interface for database operations.
 * Responsibility: Provides type-safe methods for ProductVariant CRUD operations.
 */
export interface IProductVariantRepository {
  /**
   * Purpose: Find a variant by its unique identifier.
   * Params:
   *   - id: string — The variant identifier.
   * Returns:
   *   - Promise<ProductVariant | null> — The variant or null if not found.
   */
  findById(id: string): Promise<ProductVariant | null>;

  /**
   * Purpose: Find a variant by SKU.
   * Params:
   *   - sku: string — The variant SKU.
   * Returns:
   *   - Promise<ProductVariant | null> — The variant or null if not found.
   */
  findBySku(sku: string): Promise<ProductVariant | null>;

  /**
   * Purpose: Find all variants for a product.
   * Params:
   *   - productId: string — The product identifier.
   * Returns:
   *   - Promise<ProductVariant[]> — Array of variants.
   */
  findByProductId(productId: string): Promise<ProductVariant[]>;

  /**
   * Purpose: Create a new product variant.
   * Params:
   *   - data: CreateProductVariantInput — The variant creation data.
   * Returns:
   *   - Promise<ProductVariant> — The created variant.
   */
  create(data: CreateProductVariantInput): Promise<ProductVariant>;

  /**
   * Purpose: Update an existing variant.
   * Params:
   *   - id: string — The variant identifier.
   *   - data: UpdateProductVariantInput — The update data.
   * Returns:
   *   - Promise<ProductVariant> — The updated variant.
   */
  update(id: string, data: UpdateProductVariantInput): Promise<ProductVariant>;

  /**
   * Purpose: Upsert variant by SKU (create if not exists, update if exists).
   * Params:
   *   - sku: string — The variant SKU.
   *   - productId: string — The product identifier.
   *   - data: UpsertProductVariantInput — The variant data.
   * Returns:
   *   - Promise<ProductVariant> — The created or updated variant.
   */
  upsertBySku(
    sku: string,
    productId: string,
    data: UpsertProductVariantInput
  ): Promise<ProductVariant>;

  /**
   * Purpose: Delete a variant.
   * Params:
   *   - id: string — The variant identifier.
   * Returns:
   *   - Promise<boolean> — True if deleted successfully.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Purpose: Delete all variants for a product.
   * Params:
   *   - productId: string — The product identifier.
   * Returns:
   *   - Promise<number> — Number of variants deleted.
   */
  deleteByProductId(productId: string): Promise<number>;
}

export type CreateProductVariantInput = {
  productId: string;
  sku?: string | null;
  price?: Decimal | number | null;
  compareAtPrice?: Decimal | number | null;
  currency?: string | null;
  featuredImage?: string | null;
  rawPayload?: any;
};

export type UpdateProductVariantInput = Partial<
  Omit<CreateProductVariantInput, 'productId'>
>;

export type UpsertProductVariantInput = Omit<CreateProductVariantInput, 'productId'>;

/**
 * Purpose: Prisma implementation of ProductVariant repository interface.
 * Responsibility: Handles all database operations for ProductVariant model using Prisma client.
 */
class PrismaProductVariantRepository implements IProductVariantRepository {
  /**
   * Purpose: Find a variant by its unique identifier.
   * Params:
   *   - id: string — The variant identifier.
   * Returns:
   *   - Promise<ProductVariant | null> — The variant or null if not found.
   */
  async findById(id: string): Promise<ProductVariant | null> {
    return await prisma.productVariant.findUnique({
      where: { id }
    });
  }

  /**
   * Purpose: Find a variant by SKU.
   * Params:
   *   - sku: string — The variant SKU.
   * Returns:
   *   - Promise<ProductVariant | null> — The variant or null if not found.
   */
  async findBySku(sku: string): Promise<ProductVariant | null> {
    return await prisma.productVariant.findUnique({
      where: { sku }
    });
  }

  /**
   * Purpose: Find all variants for a product.
   * Params:
   *   - productId: string — The product identifier.
   * Returns:
   *   - Promise<ProductVariant[]> — Array of variants.
   */
  async findByProductId(productId: string): Promise<ProductVariant[]> {
    return await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { id: 'asc' }
    });
  }

  /**
   * Purpose: Create a new product variant.
   * Params:
   *   - data: CreateProductVariantInput — The variant creation data.
   * Returns:
   *   - Promise<ProductVariant> — The created variant.
   */
  async create(data: CreateProductVariantInput): Promise<ProductVariant> {
    // Convert numbers to Decimal if needed
    const createData: Prisma.ProductVariantCreateInput = {
      product: {
        connect: { id: data.productId }
      },
      sku: data.sku,
      price: data.price !== null && data.price !== undefined 
        ? new Decimal(data.price) 
        : null,
      compareAtPrice: data.compareAtPrice !== null && data.compareAtPrice !== undefined
        ? new Decimal(data.compareAtPrice)
        : null,
      currency: data.currency,
      featuredImage: data.featuredImage,
      rawPayload: data.rawPayload || Prisma.JsonNull
    };

    return await prisma.productVariant.create({
      data: createData
    });
  }

  /**
   * Purpose: Update an existing variant.
   * Params:
   *   - id: string — The variant identifier.
   *   - data: UpdateProductVariantInput — The update data.
   * Returns:
   *   - Promise<ProductVariant> — The updated variant.
   */
  async update(id: string, data: UpdateProductVariantInput): Promise<ProductVariant> {
    const updateData: Prisma.ProductVariantUpdateInput = {};

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.price !== undefined) {
      updateData.price = data.price !== null ? new Decimal(data.price) : null;
    }
    if (data.compareAtPrice !== undefined) {
      updateData.compareAtPrice = data.compareAtPrice !== null 
        ? new Decimal(data.compareAtPrice) 
        : null;
    }
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage;
    if (data.rawPayload !== undefined) {
      updateData.rawPayload = data.rawPayload || Prisma.JsonNull;
    }

    return await prisma.productVariant.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Purpose: Upsert variant by SKU (create if not exists, update if exists).
   * Params:
   *   - sku: string — The variant SKU.
   *   - productId: string — The product identifier.
   *   - data: UpsertProductVariantInput — The variant data.
   * Returns:
   *   - Promise<ProductVariant> — The created or updated variant.
   */
  async upsertBySku(
    sku: string,
    productId: string,
    data: UpsertProductVariantInput
  ): Promise<ProductVariant> {
    const existing = await this.findBySku(sku);

    if (existing) {
      // Update existing variant
      return await this.update(existing.id, data);
    } else {
      // Create new variant
      return await this.create({
        productId,
        ...data
      });
    }
  }

  /**
   * Purpose: Delete a variant.
   * Params:
   *   - id: string — The variant identifier.
   * Returns:
   *   - Promise<boolean> — True if deleted successfully.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.productVariant.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Purpose: Delete all variants for a product.
   * Params:
   *   - productId: string — The product identifier.
   * Returns:
   *   - Promise<number> — Number of variants deleted.
   */
  async deleteByProductId(productId: string): Promise<number> {
    const result = await prisma.productVariant.deleteMany({
      where: { productId }
    });
    return result.count;
  }
}

// Export singleton instance
export const productVariantRepository = new PrismaProductVariantRepository();

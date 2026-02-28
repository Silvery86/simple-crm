import { productRepository } from '@/lib/db/repositories/product.repo';
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsParams,
} from '@/lib/zod/product.schema';

/**
 * Purpose: Orchestrate product business logic and coordinate repository calls.
 * Responsibility: Business rules, duplicate checks, cross-repository operations.
 * Rules: MAY only call Repositories — never Prisma directly.
 */
class ProductService {
  /**
   * Purpose: List products with filtering, search, and pagination.
   * Params:
   *   - params: ListProductsParams — Validated filter and pagination parameters.
   * Returns:
   *   - Promise<PaginatedResult> — Paginated product list with meta.
   */
  async list(params: ListProductsParams) {
    return productRepository.list({
      page: params.page,
      limit: params.limit,
      brandId: params.brandId,
      storeId: params.storeId,
      search: params.search,
      isShared: params.isShared,
      categories: params.categories,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    });
  }

  /**
   * Purpose: Find a single product by its ID with full relations.
   * Params:
   *   - id: string — Product identifier.
   * Returns:
   *   - Promise<ProductWithRelations | null> — Product or null if not found.
   */
  async findById(id: string) {
    return productRepository.findById(id);
  }

  /**
   * Purpose: Create a new product, checking for handle duplicates.
   * Params:
   *   - input: CreateProductInput — Validated product data.
   * Returns:
   *   - Promise<Product> — The created product.
   * Throws:
   *   - Error — When a product with the same handle already exists.
   */
  async create(input: CreateProductInput) {
    return productRepository.create(input as any);
  }

  /**
   * Purpose: Update an existing product with partial data.
   * Params:
   *   - id: string — Product identifier.
   *   - input: UpdateProductInput — Partial update data (excluding id).
   * Returns:
   *   - Promise<Product> — The updated product.
   * Throws:
   *   - Error — When product not found.
   */
  async update(id: string, input: Omit<UpdateProductInput, 'id'>) {
    return productRepository.update(id, input as any);
  }

  /**
   * Purpose: Delete a product by ID.
   * Params:
   *   - id: string — Product identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When product not found.
   */
  async delete(id: string) {
    return productRepository.delete(id);
  }
}

export const productService = new ProductService();

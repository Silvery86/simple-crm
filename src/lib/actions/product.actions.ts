'use server';

import { revalidatePath } from 'next/cache';
import { productService } from '@/lib/services/product.service';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ListProductsSchema,
} from '@/lib/zod/product.schema';
import { verifyServerSession } from '@/lib/auth/server-auth';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    key: string;
    message: string;
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Purpose: Get a paginated list of products with optional filters.
 * Params:
 *   - input: unknown — Filter/pagination params, validated internally.
 * Returns:
 *   - Promise<ActionResult<PaginatedResult>> — Product list or error.
 */
export async function getProductsAction(input?: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = ListProductsSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { success: false, error: { code: 'VALIDATION_ERROR', key: 'errors.validation', message: parsed.error.message } };
  }

  try {
    const result = await productService.list(parsed.data);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[getProductsAction]', error);
    return { success: false, error: { code: 'FETCH_FAILED', key: 'toast.error.loadFailed', message: error.message } };
  }
}

// ─── Get by ID ───────────────────────────────────────────────────────────────

/**
 * Purpose: Get a single product by its ID with all relations.
 * Params:
 *   - id: string — Product identifier.
 * Returns:
 *   - Promise<ActionResult<ProductWithRelations>> — Product or error.
 */
export async function getProductByIdAction(id: string): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  try {
    const product = await productService.findById(id);
    if (!product) {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: 'Product not found' } };
    }
    return { success: true, data: product };
  } catch (error: any) {
    console.error('[getProductByIdAction]', error);
    return { success: false, error: { code: 'FETCH_FAILED', key: 'toast.error.loadFailed', message: error.message } };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Create a new product.
 * Params:
 *   - input: unknown — Raw product data, validated internally with Zod.
 * Returns:
 *   - Promise<ActionResult<Product>> — Created product or error.
 */
export async function createProductAction(input: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = CreateProductSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: firstError.message, message: firstError.message },
    };
  }

  try {
    const product = await productService.create(parsed.data);
    revalidatePath('/[lang]/dashboard/products', 'page');
    return { success: true, data: product };
  } catch (error: any) {
    console.error('[createProductAction]', error);
    return { success: false, error: { code: 'CREATE_FAILED', key: 'toast.error.saveFailed', message: error.message } };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Update an existing product.
 * Params:
 *   - input: unknown — Partial product data with id, validated internally.
 * Returns:
 *   - Promise<ActionResult<Product>> — Updated product or error.
 */
export async function updateProductAction(input: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = UpdateProductSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: firstError.message, message: firstError.message },
    };
  }

  const { id, ...updateData } = parsed.data;

  try {
    const product = await productService.update(id, updateData);
    revalidatePath('/[lang]/dashboard/products', 'page');
    revalidatePath(`/[lang]/dashboard/products/${id}`, 'page');
    return { success: true, data: product };
  } catch (error: any) {
    console.error('[updateProductAction]', error);
    if (error.message === 'Product not found') {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: error.message } };
    }
    return { success: false, error: { code: 'UPDATE_FAILED', key: 'toast.error.saveFailed', message: error.message } };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Delete a product by its ID.
 * Params:
 *   - id: string — Product identifier.
 * Returns:
 *   - Promise<ActionResult<void>> — Success or error.
 */
export async function deleteProductAction(id: string): Promise<ActionResult<void>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  try {
    await productService.delete(id);
    revalidatePath('/[lang]/dashboard/products', 'page');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteProductAction]', error);
    if (error.message === 'Product not found') {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: error.message } };
    }
    return { success: false, error: { code: 'DELETE_FAILED', key: 'toast.error.deleteFailed', message: error.message } };
  }
}

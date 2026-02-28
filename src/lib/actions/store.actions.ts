'use server';

import { revalidatePath } from 'next/cache';
import { storeService } from '@/lib/services/store.service';
import { wooCommerceSyncService } from '@/lib/services/woocommerce-sync.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { validateStoreForm } from '@/lib/zod/store.schema';
import { verifyServerSession } from '@/lib/auth/server-auth';
import { z } from 'zod';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    key: string;
    message: string;
  };
  meta?: Record<string, unknown>;
}

// ─── List ─────────────────────────────────────────────────────────────────────

const ListStoresSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  platform: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

/**
 * Purpose: Get a paginated list of stores (sanitized — no consumerSecret).
 * Params:
 *   - input: unknown — Optional filter/pagination params, validated internally.
 * Returns:
 *   - Promise<ActionResult<PaginatedResult>> — Store list or error.
 */
export async function getStoresAction(input?: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = ListStoresSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { success: false, error: { code: 'VALIDATION_ERROR', key: 'errors.validation', message: parsed.error.message } };
  }

  try {
    const result = await storeService.list(parsed.data);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[getStoresAction]', error);
    return { success: false, error: { code: 'FETCH_FAILED', key: 'toast.error.loadFailed', message: error.message } };
  }
}

// ─── Get by ID ───────────────────────────────────────────────────────────────

/**
 * Purpose: Get a single store by its ID.
 * Params:
 *   - id: string — Store identifier.
 * Returns:
 *   - Promise<ActionResult<Store>> — Store or error.
 */
export async function getStoreByIdAction(id: string): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  try {
    const store = await storeService.findById(id);
    if (!store) {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: 'Store not found' } };
    }
    return { success: true, data: store };
  } catch (error: any) {
    console.error('[getStoreByIdAction]', error);
    return { success: false, error: { code: 'FETCH_FAILED', key: 'toast.error.loadFailed', message: error.message } };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Create a new store with WooCommerce credential validation.
 * Params:
 *   - input: unknown — Raw form data, validated internally with Zod.
 * Returns:
 *   - Promise<ActionResult<Store>> — Created store with connection status, or error.
 */
export async function createStoreAction(input: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = validateStoreForm(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: firstError.message, message: firstError.message },
    };
  }

  try {
    const { store, connectionStatus, message } = await storeService.create(parsed.data);
    revalidatePath('/[lang]/dashboard/stores', 'page');
    return {
      success: true,
      data: store,
      meta: { connectionStatus, message },
    };
  } catch (error: any) {
    console.error('[createStoreAction]', error);

    // Surface domain-exists error specifically
    if (error.message?.includes('domain already exists')) {
      return { success: false, error: { code: 'DOMAIN_EXISTS', key: 'toast.error.saveFailed', message: error.message } };
    }
    // Surface WooCommerce connection error
    if (error.message?.includes('WooCommerce')) {
      return {
        success: false,
        error: { code: 'WOOCOMMERCE_CONNECTION_FAILED', key: 'toast.error.connectionFailed', message: error.message },
        meta: { connectionStatus: 'failed' },
      };
    }
    return { success: false, error: { code: 'CREATE_FAILED', key: 'toast.error.saveFailed', message: error.message } };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Update an existing store.
 * Params:
 *   - id: string — Store identifier.
 *   - input: unknown — Partial form data, validated internally with Zod.
 * Returns:
 *   - Promise<ActionResult<Store>> — Updated store or error.
 */
export async function updateStoreAction(id: string, input: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = validateStoreForm(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: firstError.message, message: firstError.message },
    };
  }

  try {
    const { store, connectionStatus, message } = await storeService.update(id, parsed.data);
    revalidatePath('/[lang]/dashboard/stores', 'page');
    revalidatePath(`/[lang]/dashboard/stores/${id}`, 'page');
    return {
      success: true,
      data: store,
      meta: { connectionStatus, message },
    };
  } catch (error: any) {
    console.error('[updateStoreAction]', error);
    if (error.message === 'Store not found') {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: error.message } };
    }
    if (error.message?.includes('WooCommerce')) {
      return {
        success: false,
        error: { code: 'WOOCOMMERCE_CONNECTION_FAILED', key: 'toast.error.connectionFailed', message: error.message },
        meta: { connectionStatus: 'failed' },
      };
    }
    return { success: false, error: { code: 'UPDATE_FAILED', key: 'toast.error.saveFailed', message: error.message } };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Purpose: Delete a store by its ID.
 * Params:
 *   - id: string — Store identifier.
 * Returns:
 *   - Promise<ActionResult<void>> — Success or error.
 */
export async function deleteStoreAction(id: string): Promise<ActionResult<void>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  try {
    await storeService.delete(id);
    revalidatePath('/[lang]/dashboard/stores', 'page');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteStoreAction]', error);
    if (error.message === 'Store not found') {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: error.message } };
    }
    return { success: false, error: { code: 'DELETE_FAILED', key: 'toast.error.deleteFailed', message: error.message } };
  }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

const SyncStoreSchema = z.object({
  pageSize: z.number().int().min(1).max(500).default(100),
  maxPages: z.number().int().min(1).optional(),
  modifiedOnly: z.boolean().default(false),
});

/**
 * Purpose: Trigger a WooCommerce product sync for a specific store.
 * Params:
 *   - storeId: string — Store identifier.
 *   - input: unknown — Sync options, validated internally.
 * Returns:
 *   - Promise<ActionResult<SyncResult>> — Sync statistics or error.
 */
export async function syncStoreAction(storeId: string, input?: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = SyncStoreSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { success: false, error: { code: 'VALIDATION_ERROR', key: 'errors.validation', message: parsed.error.message } };
  }

  try {
    const store = await storeRepository.findById(storeId);
    if (!store) {
      return { success: false, error: { code: 'NOT_FOUND', key: 'errors.notFound', message: 'Store not found' } };
    }

    const result = await wooCommerceSyncService.syncStoreProducts(store as any, parsed.data);
    revalidatePath(`/[lang]/dashboard/stores/${storeId}`, 'page');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[syncStoreAction]', error);
    return { success: false, error: { code: 'SYNC_FAILED', key: 'toast.error.syncFailed', message: error.message } };
  }
}

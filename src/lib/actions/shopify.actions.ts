'use server';

import { isShopifyStore, importShopifyProducts } from '@/lib/services/shopify-import.service';
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
}

// ─── Verify ───────────────────────────────────────────────────────────────────

const VerifyShopifySchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

/**
 * Purpose: Verify if a given URL is a public Shopify store.
 * Params:
 *   - input: unknown — Object containing url, validated internally.
 * Returns:
 *   - Promise<ActionResult<{ isShopify: boolean }>> — Verification result.
 * Note: Does NOT require auth — verifying a store URL is a public operation.
 */
export async function verifyShopifyAction(input: unknown): Promise<ActionResult<{ isShopify: boolean }>> {
  const parsed = VerifyShopifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: 'errors.validation', message: parsed.error.issues[0].message },
    };
  }

  try {
    const isShopify = await isShopifyStore(parsed.data.url);
    return { success: true, data: { isShopify } };
  } catch (error: any) {
    console.error('[verifyShopifyAction]', error);
    return { success: false, error: { code: 'VERIFY_FAILED', key: 'errors.serverError', message: error.message } };
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

const ImportShopifySchema = z.object({
  storeUrl: z.string().url('Please enter a valid URL'),
  startPage: z.number().int().min(1).default(1),
  endPage: z.number().int().min(1),
  duplicateStrategy: z.enum(['overwrite', 'keepboth', 'skip']).default('skip'),
});

/**
 * Purpose: Import products from a Shopify store into the catalog.
 * Params:
 *   - input: unknown — Import options including storeUrl, page range, and duplicate strategy.
 * Returns:
 *   - Promise<ActionResult<ImportProgress>> — Import statistics or error.
 * Note: For large imports with live progress, use the SSE endpoint /api/shopify/import-stream.
 *       This action is for smaller, synchronous imports only.
 */
export async function importShopifyProductsAction(input: unknown): Promise<ActionResult<any>> {
  const session = await verifyServerSession();
  if (!session) {
    return { success: false, error: { code: 'UNAUTHORIZED', key: 'errors.unauthorized', message: 'Unauthorized' } };
  }

  const parsed = ImportShopifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', key: 'errors.validation', message: parsed.error.issues[0].message },
    };
  }

  const { storeUrl, startPage, endPage, duplicateStrategy } = parsed.data;

  try {
    const result = await importShopifyProducts(storeUrl, startPage, endPage, undefined, duplicateStrategy);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[importShopifyProductsAction]', error);
    return { success: false, error: { code: 'IMPORT_FAILED', key: 'errors.serverError', message: error.message } };
  }
}

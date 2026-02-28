import { z } from 'zod';

/**
 * Purpose: Zod schemas for product validation across actions, hooks, and forms.
 */

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  title: z
    .string()
    .min(1, 'validation.required')
    .min(2, 'Product title must be at least 2 characters')
    .max(255, 'Product title must be less than 255 characters'),

  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),

  handle: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must be a valid URL slug (lowercase, hyphens only)')
    .optional(),

  brandId: z.string().min(1, 'Invalid brand ID').optional(),

  isShared: z.boolean().default(false),

  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// ─── Update ──────────────────────────────────────────────────────────────────

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().min(1, 'Invalid product ID'),
});

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// ─── List / Filter ────────────────────────────────────────────────────────────

export const ListProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  brandId: z.string().optional(),
  storeId: z.string().optional(),
  isShared: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

// ─── Add to Store ─────────────────────────────────────────────────────────────

export const AddProductToStoreSchema = z.object({
  productId: z.string().min(1, 'Invalid product ID'),
  storeId: z.string().min(1, 'Invalid store ID'),
  customPrice: z.number().positive().optional(),
  adjustmentType: z.enum(['FIXED', 'PERCENT']).optional(),
  adjustmentValue: z.number().optional(),
});

export type AddProductToStoreInput = z.infer<typeof AddProductToStoreSchema>;

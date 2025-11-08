import { z } from 'zod';

/**
 * Purpose: Zod schemas for store validation.
 */

export const storeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.required')
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must be less than 100 characters'),
  
  platform: z.enum(['WOO', 'SHOPIFY'], {
    message: 'validation.required',
  }),
  
  domain: z
    .string()
    .min(1, 'validation.required')
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i,
      'Please enter a valid domain (e.g., example.com)'
    ),
  
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  
  country: z.string().max(100).optional(),
  
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'Currency must be 3-letter code (e.g., USD, VND)')
    .default('USD'),
  
  logo: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  
  isActive: z.boolean().default(true),
  
  consumerKey: z.string().optional(),
  
  consumerSecret: z.string().optional(),
}).refine(
  (data) => {
    // If platform is WOO and credentials provided, both must be present
    if (data.platform === 'WOO') {
      const hasKey = data.consumerKey && data.consumerKey.length > 0;
      const hasSecret = data.consumerSecret && data.consumerSecret.length > 0;
      
      // Allow placeholder '****************' (means existing secret)
      const isPlaceholder = data.consumerSecret === '****************';
      
      if ((hasKey || hasSecret) && !isPlaceholder) {
        return hasKey && hasSecret;
      }
    }
    return true;
  },
  {
    message: 'Both Consumer Key and Consumer Secret are required for WooCommerce',
    path: ['consumerSecret'],
  }
);

export type StoreFormData = z.infer<typeof storeFormSchema>;

/**
 * Purpose: Validate store form data.
 * Params:
 *   - data: unknown — Form data to validate
 * Returns:
 *   - { success: true; data: StoreFormData } | { success: false; error: ZodError }
 */
export function validateStoreForm(data: unknown) {
  return storeFormSchema.safeParse(data);
}

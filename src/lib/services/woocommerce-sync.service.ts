/**
 * WooCommerce Sync Service
 * 
 * Purpose: Sync products from WooCommerce stores to CRM
 * Features:
 * - Pull products from WooCommerce REST API
 * - Pagination support for large catalogs
 * - Duplicate detection before import
 * - Build variants from WooCommerce format
 * - Track sync timestamps
 * 
 * Use Cases:
 * - Manual sync trigger from UI
 * - Scheduled cron job sync
 * - Initial store setup import
 */

import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { Product } from '@prisma/client';
import { productRepository } from '@/lib/db/repositories/product.repo';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { storeProductMapRepository } from '@/lib/db/repositories/store-product-map.repo';
import { duplicateDetectionService, DuplicateCheckResult } from './duplicate-detection.service';

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ productId: string; title: string; error: string }>;
  duration: number; // milliseconds
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
  attributes: Array<any>;
  variations: number[];
  meta_data: Array<any>;
}

export class WooCommerceSyncService {
  private duplicateDetector = duplicateDetectionService;

  /**
   * Purpose: Sync all products from WooCommerce store to CRM.
   * Params:
   *   - storeId: string — Store ID in CRM.
   *   - options: Object — Sync options.
   * Returns:
   *   - Promise<SyncResult> — Sync statistics.
   */
  async syncStoreProducts(
    storeId: string,
    options?: {
      modifiedAfter?: Date; 
      pageSize?: number;
      maxPages?: number; 
    }
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    try {
      const store = await storeRepository.findById(storeId);
      
      if (!store) {
        throw new Error(`Store not found: ${storeId}`);
      }

      if (!store.isActive) {
        throw new Error(`Store is not active: ${store.name}`);
      }

      if (store.platform !== 'WOO') {
        throw new Error(`Store platform must be WOO, got: ${store.platform}`);
      }

      if (!store.consumerKey || !store.consumerSecret) {
        throw new Error(`Store missing WooCommerce credentials`);
      }

      const api = new WooCommerceRestApi({
        url: store.domain,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        version: "wc/v3",
        queryStringAuth: true 
      });

      const pageSize = options?.pageSize || 100;
      const maxPages = options?.maxPages || Infinity;
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= maxPages) {
        try {
          console.log(`[WooSync] Fetching page ${currentPage} for store ${store.name}...`);

          const params: any = {
            per_page: pageSize,
            page: currentPage,
            orderby: 'modified',
            order: 'desc'
          };

          if (options?.modifiedAfter) {
            params.modified_after = options.modifiedAfter.toISOString();
          }

          const response = await api.get("products", params);
          const products: WooProduct[] = response.data;

          if (!products || products.length === 0) {
            hasMorePages = false;
            break;
          }

          console.log(`[WooSync] Processing ${products.length} products from page ${currentPage}...`);

          for (const wooProduct of products) {
            try {
              await this.processProduct(storeId, wooProduct);
              result.total++;
              result.created++; 
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                productId: String(wooProduct.id),
                title: wooProduct.name,
                error: error.message
              });
              console.error(`[WooSync] Error processing product ${wooProduct.id}:`, error.message);
            }
          }

          const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
          hasMorePages = currentPage < totalPages;
          currentPage++;

        } catch (error: any) {
          console.error(`[WooSync] Error fetching page ${currentPage}:`, error.message);
          hasMorePages = false;
        }
      }

      result.duration = Date.now() - startTime;
      console.log(`[WooSync] Completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`);

      return result;

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.failed = result.total;
      result.errors.push({
        productId: 'SYNC_ERROR',
        title: 'Sync Failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Purpose: Process single WooCommerce product.
   * Params:
   *   - storeId: string — Store ID.
   *   - wooProduct: WooProduct — Product data from WooCommerce.
   * Returns:
   *   - Promise<void>
   */
  private async processProduct(storeId: string, wooProduct: WooProduct): Promise<void> {
    const duplicateCheck: DuplicateCheckResult = await this.duplicateDetector.findDuplicates({
      sku: wooProduct.sku || null,
      handle: wooProduct.slug || null,
      title: wooProduct.name
    });

    let product: Product;

    if (duplicateCheck.found && duplicateCheck.match) {
      console.log(`[WooSync] Duplicate found (${duplicateCheck.method}): ${wooProduct.name}`);
      
      product = await productRepository.update(duplicateCheck.match.id, {
        title: wooProduct.name,
        description: wooProduct.description || wooProduct.short_description,
        handle: wooProduct.slug,
        vendor: null,
        categories: wooProduct.categories.map(cat => cat.name),
        images: wooProduct.images.map(img => img.src),
        rawPayload: wooProduct as any
      });

    } else {
      console.log(`[WooSync] Creating new product: ${wooProduct.name}`);
      
      product = await productRepository.create({
        title: wooProduct.name,
        description: wooProduct.description || wooProduct.short_description,
        brandId: null,
        handle: wooProduct.slug,
        vendor: null,
        options: wooProduct.attributes.length > 0 ? wooProduct.attributes : null,
        isShared: false, 
        categories: wooProduct.categories.map(cat => cat.name),
        images: wooProduct.images.map(img => img.src),
        rawPayload: wooProduct as any
      });
    }

    await this.syncProductVariants(product.id, wooProduct);

    const existingMapping = await storeProductMapRepository.findByStoreAndProduct(storeId, product.id);

    if (!existingMapping) {
      await storeProductMapRepository.create({
        storeId,
        productId: product.id,
        externalId: String(wooProduct.id),
        customTitle: null,
        customDescription: null,
        customPrice: null,
        customCompareAtPrice: null,
        customCurrency: null,
        priceAdjustment: null,
        isActive: wooProduct.status === 'publish',
        displayOrder: null,
        lastSyncedAt: new Date(),
        syncSource: 'WOO'
      });
    } else {
      await storeProductMapRepository.update(storeId, product.id, {
        externalId: String(wooProduct.id),
        isActive: wooProduct.status === 'publish',
        lastSyncedAt: new Date(),
        syncSource: 'WOO'
      });
    }
  }

  /**
   * Purpose: Sync product variants from WooCommerce.
   * Params:
   *   - productId: string — Product ID in CRM.
   *   - wooProduct: WooProduct — WooCommerce product data.
   * Returns:
   *   - Promise<void>
   */
  private async syncProductVariants(productId: string, wooProduct: WooProduct): Promise<void> {
    // For simple products, create a single variant
    if (wooProduct.type === 'simple') {
      const variants = await this.buildSimpleVariant(wooProduct);
      
      // TODO: Create or update variant in database
      // This requires a ProductVariantRepository which we don't have yet
      // For now, we'll skip this and handle it later
      console.log(`[WooSync] Simple product variant: SKU=${variants.sku}, Price=${variants.price}`);
    }

    // For variable products, fetch and sync variations
    if (wooProduct.type === 'variable' && wooProduct.variations.length > 0) {
      console.log(`[WooSync] Variable product with ${wooProduct.variations.length} variations - skipping for now`);
      // TODO: Implement variation sync
      // This requires fetching each variation from WooCommerce API
      // GET /products/<id>/variations/<variation_id>
    }
  }

  /**
   * Purpose: Build variant data for simple product.
   * Params:
   *   - wooProduct: WooProduct — WooCommerce product.
   * Returns:
   *   - Object — Variant data.
   */
  private buildSimpleVariant(wooProduct: WooProduct) {
    return {
      sku: wooProduct.sku || `WOO-${wooProduct.id}`,
      price: parseFloat(wooProduct.price || wooProduct.regular_price || '0'),
      compareAtPrice: wooProduct.sale_price 
        ? parseFloat(wooProduct.regular_price || '0') 
        : null,
      currency: 'USD', // TODO: Get from store settings
      featuredImage: wooProduct.images[0]?.src || null,
      rawPayload: {
        id: wooProduct.id,
        regular_price: wooProduct.regular_price,
        sale_price: wooProduct.sale_price,
        on_sale: wooProduct.on_sale
      }
    };
  }

  /**
   * Purpose: Get last sync time for a store.
   * Params:
   *   - storeId: string — Store ID.
   * Returns:
   *   - Promise<Date | null> — Last sync timestamp.
   */
  async getLastSyncTime(storeId: string): Promise<Date | null> {
    const mappings = await storeProductMapRepository.findByStore(storeId, {
      page: 1,
      pageSize: 1
    });

    if (mappings.mappings.length === 0) {
      return null;
    }

    const lastSync = mappings.mappings[0].lastSyncedAt;
    return lastSync ? new Date(lastSync) : null;
  }

  /**
   * Purpose: Sync only products modified since last sync.
   * Params:
   *   - storeId: string — Store ID.
   * Returns:
   *   - Promise<SyncResult> — Sync result.
   */
  async syncModifiedProducts(storeId: string): Promise<SyncResult> {
    const lastSync = await this.getLastSyncTime(storeId);
    
    if (lastSync) {
      console.log(`[WooSync] Syncing products modified after ${lastSync.toISOString()}`);
      return this.syncStoreProducts(storeId, {
        modifiedAfter: lastSync
      });
    }

    console.log(`[WooSync] No previous sync found, syncing all products`);
    return this.syncStoreProducts(storeId);
  }
}

// Export singleton instance
export const wooCommerceSyncService = new WooCommerceSyncService();

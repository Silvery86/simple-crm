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
import { productVariantRepository } from '@/lib/db/repositories/product-variant.repo';
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

export interface WooVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  image: { id: number; src: string; name: string; alt: string } | null;
  attributes: Array<{ id: number; name: string; option: string }>;
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

      // Extract currency from store settings (if available)
      let storeCurrency = 'USD'; // Default fallback
      if (store.settings && typeof store.settings === 'object') {
        const settings = store.settings as any;
        storeCurrency = settings.currency || 'USD';
      }

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
              const status = await this.processProduct(storeId, wooProduct, storeCurrency);
              result.total++;
              if (status === 'created') {
                result.created++;
              } else if (status === 'updated') {
                result.updated++;
              }
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
   *   - storeCurrency: string — Store currency.
   * Returns:
   *   - Promise<'created' | 'updated'> — Status of the operation.
   */
  private async processProduct(storeId: string, wooProduct: WooProduct, storeCurrency: string = 'USD'): Promise<'created' | 'updated'> {
    const duplicateCheck: DuplicateCheckResult = await this.duplicateDetector.findDuplicates({
      sku: wooProduct.sku || null,
      handle: wooProduct.slug || null,
      title: wooProduct.name
    });

    let product: Product;
    let isNewProduct = false;

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
      isNewProduct = true;
      
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

    // Pass API client to sync variations (needed for fetching individual variations)
    const store = await storeRepository.findById(storeId);
    const api = store ? new WooCommerceRestApi({
      url: store.domain,
      consumerKey: store.consumerKey!,
      consumerSecret: store.consumerSecret!,
      version: "wc/v3",
      queryStringAuth: true
    }) : null;

    await this.syncProductVariants(product.id, wooProduct, storeCurrency, api);

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

    return isNewProduct ? 'created' : 'updated';
  }

  /**
   * Purpose: Sync product variants from WooCommerce.
   * Params:
   *   - productId: string — Product ID in CRM.
   *   - wooProduct: WooProduct — WooCommerce product data.
   *   - storeCurrency: string — Currency from store settings.
   *   - api: WooCommerceRestApi | null — WooCommerce API client for fetching variations.
   * Returns:
   *   - Promise<void>
   */
  private async syncProductVariants(
    productId: string, 
    wooProduct: WooProduct, 
    storeCurrency: string = 'USD',
    api: WooCommerceRestApi | null = null
  ): Promise<void> {
    // For simple products, create a single variant
    if (wooProduct.type === 'simple') {
      const variantData = this.buildSimpleVariant(wooProduct, storeCurrency);
      
      // Upsert variant by SKU
      if (variantData.sku) {
        await productVariantRepository.upsertBySku(
          variantData.sku,
          productId,
          {
            sku: variantData.sku,
            price: variantData.price,
            compareAtPrice: variantData.compareAtPrice,
            currency: variantData.currency,
            featuredImage: variantData.featuredImage,
            rawPayload: variantData.rawPayload
          }
        );
        console.log(`[WooSync] Simple product variant synced: SKU=${variantData.sku}, Price=${variantData.price}`);
      } else {
        // If no SKU, check if variant exists and update, otherwise create
        const existingVariants = await productVariantRepository.findByProductId(productId);
        
        if (existingVariants.length > 0) {
          // Update first variant
          await productVariantRepository.update(existingVariants[0].id, {
            price: variantData.price,
            compareAtPrice: variantData.compareAtPrice,
            currency: variantData.currency,
            featuredImage: variantData.featuredImage,
            rawPayload: variantData.rawPayload
          });
          console.log(`[WooSync] Simple product variant updated (no SKU)`);
        } else {
          // Create new variant
          await productVariantRepository.create({
            productId,
            sku: variantData.sku,
            price: variantData.price,
            compareAtPrice: variantData.compareAtPrice,
            currency: variantData.currency,
            featuredImage: variantData.featuredImage,
            rawPayload: variantData.rawPayload
          });
          console.log(`[WooSync] Simple product variant created (no SKU)`);
        }
      }
    }

    // For variable products, fetch and sync variations
    if (wooProduct.type === 'variable' && wooProduct.variations.length > 0) {
      console.log(`[WooSync] Variable product with ${wooProduct.variations.length} variations`);
      
      if (!api) {
        console.warn(`[WooSync] No API client provided, skipping variation sync`);
        return;
      }

      // Fetch and sync each variation
      for (const variationId of wooProduct.variations) {
        try {
          // Fetch individual variation from WooCommerce API
          const response = await api.get(`products/${wooProduct.id}/variations/${variationId}`);
          const variation: WooVariation = response.data;

          // Build variant data from WooCommerce variation
          const variantData = this.buildVariationData(variation, storeCurrency);

          // Upsert variant by SKU
          if (variantData.sku) {
            await productVariantRepository.upsertBySku(
              variantData.sku,
              productId,
              {
                sku: variantData.sku,
                price: variantData.price,
                compareAtPrice: variantData.compareAtPrice,
                currency: variantData.currency,
                featuredImage: variantData.featuredImage,
                rawPayload: variantData.rawPayload
              }
            );
            console.log(`[WooSync] Variation synced: SKU=${variantData.sku}, Price=${variantData.price}`);
          } else {
            // If variation has no SKU, create with generated SKU
            const generatedSku = `WOO-${wooProduct.id}-VAR-${variation.id}`;
            await productVariantRepository.upsertBySku(
              generatedSku,
              productId,
              {
                sku: generatedSku,
                price: variantData.price,
                compareAtPrice: variantData.compareAtPrice,
                currency: variantData.currency,
                featuredImage: variantData.featuredImage,
                rawPayload: variantData.rawPayload
              }
            );
            console.log(`[WooSync] Variation synced (generated SKU): ${generatedSku}`);
          }

        } catch (error: any) {
          console.error(`[WooSync] Error syncing variation ${variationId}:`, error.message);
          // Continue with next variation
        }
      }

      console.log(`[WooSync] Completed syncing ${wooProduct.variations.length} variations for product ${wooProduct.id}`);
    }
  }

  /**
   * Purpose: Build variant data for simple product.
   * Params:
   *   - wooProduct: WooProduct — WooCommerce product.
   *   - storeCurrency: string — Currency from store settings.
   * Returns:
   *   - Object — Variant data.
   */
  private buildSimpleVariant(wooProduct: WooProduct, storeCurrency: string = 'USD') {
    return {
      sku: wooProduct.sku || `WOO-${wooProduct.id}`,
      price: parseFloat(wooProduct.price || wooProduct.regular_price || '0'),
      compareAtPrice: wooProduct.sale_price 
        ? parseFloat(wooProduct.regular_price || '0') 
        : null,
      currency: storeCurrency, // Use store currency from settings
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
   * Purpose: Build variant data from WooCommerce variation.
   * Params:
   *   - variation: WooVariation — WooCommerce variation data.
   *   - storeCurrency: string — Currency from store settings.
   * Returns:
   *   - Object — Variant data.
   */
  private buildVariationData(variation: WooVariation, storeCurrency: string = 'USD') {
    return {
      sku: variation.sku || null,
      price: parseFloat(variation.price || variation.regular_price || '0'),
      compareAtPrice: variation.sale_price && variation.on_sale
        ? parseFloat(variation.regular_price || '0')
        : null,
      currency: storeCurrency,
      featuredImage: variation.image?.src || null,
      rawPayload: {
        id: variation.id,
        regular_price: variation.regular_price,
        sale_price: variation.sale_price,
        on_sale: variation.on_sale,
        attributes: variation.attributes, // Store variation attributes (e.g., size, color)
        stock_quantity: variation.stock_quantity,
        stock_status: variation.stock_status
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
    // Find the most recently synced product for this store
    const mappings = await storeProductMapRepository.findByStore(storeId, {
      page: 1,
      pageSize: 1,
      orderBy: { lastSyncedAt: 'desc' } // Explicitly order by lastSyncedAt
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

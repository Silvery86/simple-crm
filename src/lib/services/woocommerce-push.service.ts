/**
 * WooCommerce Push Service
 * 
 * Purpose: Push products from CRM to WooCommerce stores
 * Features:
 * - Create products on WooCommerce
 * - Check for duplicates before creating
 * - Upload product images
 * - Create product variants
 * - Update existing products
 * 
 * Use Cases:
 * - Push new product to specific store
 * - Push shared product to all stores
 * - Update existing product on WooCommerce
 */

import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { Product, ProductVariant } from '@prisma/client';
import { productRepository } from '@/lib/db/repositories/product.repo';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { storeProductMapRepository } from '@/lib/db/repositories/store-product-map.repo';
import { productVariantRepository } from '@/lib/db/repositories/product-variant.repo';

export interface PushResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped';
  externalId?: string; // WooCommerce product ID
  url?: string; // Product URL on WooCommerce
  error?: string;
}

export interface PushOptions {
  forceUpdate?: boolean; // Force update even if product exists
  skipImages?: boolean; // Skip image upload
  status?: 'publish' | 'draft' | 'pending'; // Product status on WooCommerce
}

export class WooCommercePushService {
  /**
   * Purpose: Push a single product to WooCommerce store.
   * Params:
   *   - productId: string — Product ID in CRM.
   *   - storeId: string — Target store ID.
   *   - options: PushOptions — Push options.
   * Returns:
   *   - Promise<PushResult> — Push result.
   */
  async pushProductToStore(
    productId: string,
    storeId: string,
    options?: PushOptions
  ): Promise<PushResult> {
    try {
      // Get product with variants
      const product = await productRepository.findById(productId);
      
      if (!product) {
        return {
          success: false,
          action: 'skipped',
          error: `Product not found: ${productId}`
        };
      }

      // Get store credentials
      const store = await storeRepository.findById(storeId);
      
      if (!store) {
        return {
          success: false,
          action: 'skipped',
          error: `Store not found: ${storeId}`
        };
      }

      if (!store.isActive) {
        return {
          success: false,
          action: 'skipped',
          error: `Store is not active: ${store.name}`
        };
      }

      if (store.platform !== 'WOO') {
        return {
          success: false,
          action: 'skipped',
          error: `Store platform must be WOO, got: ${store.platform}`
        };
      }

      if (!store.consumerKey || !store.consumerSecret) {
        return {
          success: false,
          action: 'skipped',
          error: `Store missing WooCommerce credentials`
        };
      }

      // Initialize WooCommerce API client
      const api = new WooCommerceRestApi({
        url: store.domain,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        version: "wc/v3",
        queryStringAuth: true
      });

      // Check if product already exists on WooCommerce
      const existingMapping = await storeProductMapRepository.findByStoreAndProduct(storeId, productId);
      
      if (existingMapping && existingMapping.externalId && !options?.forceUpdate) {
        // Product already exists and we're not forcing update
        return {
          success: true,
          action: 'skipped',
          externalId: existingMapping.externalId,
          error: 'Product already exists on WooCommerce (use forceUpdate to update)'
        };
      }

      // Get product variants
      const variants = await productVariantRepository.findByProductId(productId);

      // Check for duplicate by SKU
      if (variants.length > 0 && variants[0].sku) {
        const isDuplicate = await this.checkWooCommerceProduct(api, variants[0].sku);
        
        if (isDuplicate && !options?.forceUpdate) {
          return {
            success: true,
            action: 'skipped',
            error: `Product with SKU ${variants[0].sku} already exists on WooCommerce`
          };
        }
      }

      // Get store-specific overrides
      const customTitle = existingMapping?.customTitle || product.title;
      const customDescription = existingMapping?.customDescription || product.description;

      // Build WooCommerce product data
      const wooProductData = this.buildWooProductData(
        product,
        variants,
        {
          title: customTitle,
          description: customDescription,
          status: options?.status || 'publish',
          skipImages: options?.skipImages || false
        }
      );

      let wooProduct: any;
      let action: 'created' | 'updated';

      if (existingMapping && existingMapping.externalId && options?.forceUpdate) {
        // Update existing product
        console.log(`[WooPush] Updating product ${existingMapping.externalId} on ${store.name}...`);
        const response = await api.put(`products/${existingMapping.externalId}`, wooProductData);
        wooProduct = response.data;
        action = 'updated';
      } else {
        // Create new product
        console.log(`[WooPush] Creating product on ${store.name}...`);
        const response = await api.post("products", wooProductData);
        wooProduct = response.data;
        action = 'created';
      }

      // Create or update store-product mapping
      if (!existingMapping) {
        await storeProductMapRepository.create({
          storeId,
          productId,
          externalId: String(wooProduct.id),
          customTitle: null,
          customDescription: null,
          customPrice: null,
          customCompareAtPrice: null,
          customCurrency: null,
          priceAdjustment: null,
          isActive: true,
          displayOrder: null,
          lastSyncedAt: new Date(),
          syncSource: 'WEB_PUSH'
        });
      } else {
        await storeProductMapRepository.update(storeId, productId, {
          externalId: String(wooProduct.id),
          lastSyncedAt: new Date(),
          syncSource: 'WEB_PUSH'
        });
      }

      return {
        success: true,
        action,
        externalId: String(wooProduct.id),
        url: wooProduct.permalink
      };

    } catch (error: any) {
      console.error('[WooPush] Error pushing product:', error.message);
      return {
        success: false,
        action: 'skipped',
        error: error.message
      };
    }
  }

  /**
   * Purpose: Push product to all active WooCommerce stores.
   * Params:
   *   - productId: string — Product ID.
   *   - options: PushOptions — Push options.
   * Returns:
   *   - Promise<Map<storeId, PushResult>> — Results per store.
   */
  async pushProductToAllStores(
    productId: string,
    options?: PushOptions
  ): Promise<Map<string, PushResult>> {
    const results = new Map<string, PushResult>();

    try {
      // Get all active WooCommerce stores
      const result = await storeRepository.list({
        platform: 'WOO'
      });

      // Filter active stores
      const activeStores = result.data.filter(store => store.isActive);

      console.log(`[WooPush] Pushing product to ${activeStores.length} stores...`);

      // Push to each store
      for (const store of activeStores) {
        const pushResult = await this.pushProductToStore(productId, store.id, options);
        results.set(store.id, pushResult);
      }

      return results;

    } catch (error: any) {
      console.error('[WooPush] Error pushing to all stores:', error.message);
      throw error;
    }
  }

  /**
   * Purpose: Check if product exists on WooCommerce by SKU.
   * Params:
   *   - api: WooCommerceRestApi — WooCommerce API client.
   *   - sku: string — Product SKU.
   * Returns:
   *   - Promise<boolean> — True if product exists.
   */
  private async checkWooCommerceProduct(
    api: WooCommerceRestApi,
    sku: string
  ): Promise<boolean> {
    try {
      const response = await api.get("products", {
        sku,
        per_page: 1
      });

      const products = response.data;
      return products && products.length > 0;

    } catch (error: any) {
      console.error('[WooPush] Error checking product:', error.message);
      return false;
    }
  }

  /**
   * Purpose: Build WooCommerce product data from CRM product.
   * Params:
   *   - product: Product — CRM product.
   *   - variants: ProductVariant[] — Product variants.
   *   - overrides: Object — Title/description/status overrides.
   * Returns:
   *   - Object — WooCommerce product data.
   */
  private buildWooProductData(
    product: Product,
    variants: ProductVariant[],
    overrides: {
      title: string;
      description: string | null;
      status: string;
      skipImages: boolean;
    }
  ): any {
    const firstVariant = variants[0];
    
    const wooData: any = {
      name: overrides.title,
      type: 'simple', // For now, only simple products
      status: overrides.status,
      description: overrides.description || '',
      short_description: overrides.description?.substring(0, 200) || '',
      slug: product.handle || undefined,
      categories: this.buildWooCategories(product.categories as string[]),
      images: overrides.skipImages ? [] : this.buildWooImages(product.images as string[])
    };

    // Add variant data (price, SKU, etc.)
    if (firstVariant) {
      if (firstVariant.sku) {
        wooData.sku = firstVariant.sku;
      }
      
      if (firstVariant.price) {
        wooData.regular_price = firstVariant.price.toString();
      }

      if (firstVariant.compareAtPrice) {
        wooData.sale_price = firstVariant.price?.toString() || '';
        wooData.regular_price = firstVariant.compareAtPrice.toString();
      }

      // Stock management
      // Note: inventoryQuantity field will be added in future schema updates
      // For now, default to in stock
      wooData.stock_status = 'instock';
    }

    return wooData;
  }

  /**
   * Purpose: Build WooCommerce categories array.
   * Params:
   *   - categories: string[] — Category names.
   * Returns:
   *   - Array — WooCommerce category objects.
   */
  private buildWooCategories(categories: string[] | null): any[] {
    if (!categories || categories.length === 0) {
      return [];
    }

    return categories.map(name => ({
      name
    }));
  }

  /**
   * Purpose: Build WooCommerce images array.
   * Params:
   *   - images: string[] — Image URLs.
   * Returns:
   *   - Array — WooCommerce image objects.
   */
  private buildWooImages(images: string[] | null): any[] {
    if (!images || images.length === 0) {
      return [];
    }

    return images.map((src, index) => ({
      src,
      position: index
    }));
  }

  /**
   * Purpose: Update product on WooCommerce.
   * Params:
   *   - productId: string — Product ID in CRM.
   *   - storeId: string — Store ID.
   * Returns:
   *   - Promise<PushResult> — Update result.
   */
  async updateProductOnStore(
    productId: string,
    storeId: string
  ): Promise<PushResult> {
    return this.pushProductToStore(productId, storeId, {
      forceUpdate: true
    });
  }

  /**
   * Purpose: Delete product from WooCommerce store.
   * Params:
   *   - productId: string — Product ID in CRM.
   *   - storeId: string — Store ID.
   * Returns:
   *   - Promise<boolean> — True if deleted.
   */
  async deleteProductFromStore(
    productId: string,
    storeId: string
  ): Promise<boolean> {
    try {
      // Get mapping
      const mapping = await storeProductMapRepository.findByStoreAndProduct(storeId, productId);
      
      if (!mapping || !mapping.externalId) {
        console.log('[WooPush] No mapping found, nothing to delete');
        return false;
      }

      // Get store
      const store = await storeRepository.findById(storeId);
      
      if (!store || !store.consumerKey || !store.consumerSecret) {
        throw new Error('Store credentials not found');
      }

      // Initialize WooCommerce API
      const api = new WooCommerceRestApi({
        url: store.domain,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
        version: "wc/v3",
        queryStringAuth: true
      });

      // Delete from WooCommerce (force=true for permanent delete)
      await api.delete(`products/${mapping.externalId}`, {
        force: true
      });

      // Delete mapping
      await storeProductMapRepository.delete(storeId, productId);

      console.log(`[WooPush] Deleted product ${mapping.externalId} from ${store.name}`);
      return true;

    } catch (error: any) {
      console.error('[WooPush] Error deleting product:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const wooCommercePushService = new WooCommercePushService();

/**
 * Product Display Service
 * 
 * Purpose: Get product with correct price based on context
 * Pricing Logic: Store Override > Auto Adjustment > Master Price
 * 
 * Use Cases:
 * - Display product in store catalog
 * - Show price comparison across stores
 * - Apply auto markup/discount rules
 */

import { Product, ProductVariant, StoreProductMap } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { productRepository } from '@/lib/db/repositories/product.repo';
import { storeProductMapRepository } from '@/lib/db/repositories/store-product-map.repo';

export interface ProductWithPrice {
  id: string;
  title: string;
  description: string | null;
  handle: string | null;
  vendor: string | null;
  isShared: boolean;
  categories: string[];
  images: string[];
  
  // Display price (resolved from store/master)
  displayPrice: number;
  displayCompareAtPrice: number | null;
  displayCurrency: string;
  priceSource: 'MASTER' | 'STORE_OVERRIDE' | 'AUTO_ADJUSTED';
  
  // Original data (simplified from repository)
  variants: Array<{
    id: string;
    sku: string | null;
    price: any;
    compareAtPrice: any;
    currency: string | null;
  }>;
  brand?: any;
  mapping?: StoreProductMap;
}

export interface PriceComparison {
  productId: string;
  productTitle: string;
  masterPrice: number | null;
  stores: Array<{
    storeId: string;
    storeName: string;
    price: number;
    compareAtPrice: number | null;
    currency: string;
    priceSource: 'MASTER' | 'STORE_OVERRIDE' | 'AUTO_ADJUSTED';
    adjustment?: PriceAdjustmentRule | null;
  }>;
}

export interface PriceAdjustmentRule {
  type: 'markup' | 'discount' | 'fixed';
  value: number;
  unit: 'percent' | 'amount';
}

export class ProductDisplayService {
  /**
   * Get product with correct price for display
   * 
   * Context:
   * - storeId: Get store-specific price (override or adjusted)
   * - null/undefined: Get master price from variants
   * 
   * @param productId - Product ID
   * @param context - Display context (store ID)
   * @returns Product with resolved price
   */
  async getProductWithPrice(
    productId: string,
    context?: { storeId?: string }
  ): Promise<ProductWithPrice | null> {
    // Get product with variants and brand using repository
    const product = await productRepository.findById(productId);

    if (!product) {
      return null;
    }

    // Get master price from first variant
    const masterVariant = product.variants[0];
    const masterPrice = this.parsePrice(masterVariant?.price);
    const masterCompareAtPrice = this.parsePrice(masterVariant?.compareAtPrice);
    const masterCurrency = masterVariant?.currency || 'USD';

    // If no store context, return master price
    if (!context?.storeId) {
      return {
        id: product.id,
        title: product.title,
        description: product.description,
        handle: product.handle,
        vendor: product.vendor,
        isShared: product.isShared,
        categories: product.categories,
        images: product.images,
        displayPrice: masterPrice,
        displayCompareAtPrice: masterCompareAtPrice,
        displayCurrency: masterCurrency,
        priceSource: 'MASTER',
        variants: product.variants,
        brand: product.brand
      };
    }

    // Get store-product mapping using repository
    const mapping = await storeProductMapRepository.findByStoreAndProduct(
      context.storeId,
      productId
    );

    if (!mapping) {
      // Product not in this store, return master price
      return {
        id: product.id,
        title: product.title,
        description: product.description,
        handle: product.handle,
        vendor: product.vendor,
        isShared: product.isShared,
        categories: product.categories,
        images: product.images,
        displayPrice: masterPrice,
        displayCompareAtPrice: masterCompareAtPrice,
        displayCurrency: masterCurrency,
        priceSource: 'MASTER',
        variants: product.variants,
        brand: product.brand
      };
    }

    // Resolve price: Override > Adjustment > Master
    let displayPrice = masterPrice;
    let displayCompareAtPrice = masterCompareAtPrice;
    let displayCurrency = masterCurrency;
    let priceSource: 'MASTER' | 'STORE_OVERRIDE' | 'AUTO_ADJUSTED' = 'MASTER';

    // Check for custom override
    if (mapping.customPrice !== null && mapping.customPrice !== undefined) {
      displayPrice = this.parsePrice(mapping.customPrice);
      displayCompareAtPrice = this.parsePrice(mapping.customCompareAtPrice);
      displayCurrency = mapping.customCurrency || masterCurrency;
      priceSource = 'STORE_OVERRIDE';
    } 
    // Check for price adjustment rule
    else if (mapping.priceAdjustment) {
      const adjustment = mapping.priceAdjustment as unknown as PriceAdjustmentRule;
      displayPrice = this.applyPriceAdjustment(masterPrice, adjustment);
      if (masterCompareAtPrice) {
        displayCompareAtPrice = this.applyPriceAdjustment(masterCompareAtPrice, adjustment);
      }
      priceSource = 'AUTO_ADJUSTED';
    }

    return {
      id: product.id,
      title: mapping.customTitle || product.title,
      description: mapping.customDescription || product.description,
      handle: product.handle,
      vendor: product.vendor,
      isShared: product.isShared,
      categories: product.categories,
      images: product.images,
      displayPrice,
      displayCompareAtPrice,
      displayCurrency,
      priceSource,
      variants: product.variants,
      brand: product.brand,
      mapping
    };
  }

  /**
   * Get all products with prices for a store
   * 
   * @param storeId - Store ID
   * @param options - Pagination and filters
   * @returns Array of products with resolved prices
   */
  async getStoreProducts(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      isActive?: boolean;
      categoryFilter?: string[];
    }
  ): Promise<{
    products: ProductWithPrice[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      storeId,
    };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    // Get store product mappings using repository
    const { mappings, total } = await storeProductMapRepository.findByStore(storeId, {
      page,
      pageSize,
      isActive: options?.isActive,
      include: {
        product: {
          include: {
            variants: true,
            brand: true
          }
        }
      }
    });

    // Transform to ProductWithPrice
    const products: ProductWithPrice[] = [];

    for (const mapping of mappings) {
      const product = mapping.product;
      const masterVariant = product.variants[0];
      const masterPrice = this.parsePrice(masterVariant?.price);
      const masterCompareAtPrice = this.parsePrice(masterVariant?.compareAtPrice);
      const masterCurrency = masterVariant?.currency || 'USD';

      // Resolve price
      let displayPrice = masterPrice;
      let displayCompareAtPrice = masterCompareAtPrice;
      let displayCurrency = masterCurrency;
      let priceSource: 'MASTER' | 'STORE_OVERRIDE' | 'AUTO_ADJUSTED' = 'MASTER';

      if (mapping.customPrice !== null && mapping.customPrice !== undefined) {
        displayPrice = this.parsePrice(mapping.customPrice);
        displayCompareAtPrice = this.parsePrice(mapping.customCompareAtPrice);
        displayCurrency = mapping.customCurrency || masterCurrency;
        priceSource = 'STORE_OVERRIDE';
      } else if (mapping.priceAdjustment) {
        const adjustment = mapping.priceAdjustment as unknown as PriceAdjustmentRule;
        displayPrice = this.applyPriceAdjustment(masterPrice, adjustment);
        if (masterCompareAtPrice) {
          displayCompareAtPrice = this.applyPriceAdjustment(masterCompareAtPrice, adjustment);
        }
        priceSource = 'AUTO_ADJUSTED';
      }

      products.push({
        id: product.id,
        title: mapping.customTitle || product.title,
        description: mapping.customDescription || product.description,
        handle: product.handle,
        vendor: product.vendor,
        isShared: product.isShared,
        categories: product.categories,
        images: product.images,
        displayPrice,
        displayCompareAtPrice,
        displayCurrency,
        priceSource,
        variants: product.variants,
        brand: product.brand,
        mapping
      });
    }

    return {
      products,
      total,
      page,
      pageSize
    };
  }

  /**
   * Compare product prices across all stores
   * 
   * @param productId - Product ID
   * @returns Price comparison data
   */
  async compareProductPrices(productId: string): Promise<PriceComparison | null> {
    // Get product using repository
    const product = await productRepository.findById(productId);

    if (!product) {
      return null;
    }

    // Get master price
    const masterVariant = product.variants[0];
    const masterPrice = this.parsePrice(masterVariant?.price);

    // Get all store mappings for this product using repository
    const mappings = await storeProductMapRepository.findByProduct(productId, {
      store: true
    });

    // Get prices for each store
    const stores = [];

    for (const mapping of mappings) {
      let price = masterPrice;
      let compareAtPrice = this.parsePrice(masterVariant?.compareAtPrice);
      let currency = masterVariant?.currency || 'USD';
      let priceSource: 'MASTER' | 'STORE_OVERRIDE' | 'AUTO_ADJUSTED' = 'MASTER';
      let adjustment: PriceAdjustmentRule | null = null;

      if (mapping.customPrice !== null && mapping.customPrice !== undefined) {
        price = this.parsePrice(mapping.customPrice);
        compareAtPrice = this.parsePrice(mapping.customCompareAtPrice);
        currency = mapping.customCurrency || currency;
        priceSource = 'STORE_OVERRIDE';
      } else if (mapping.priceAdjustment) {
        adjustment = mapping.priceAdjustment as unknown as PriceAdjustmentRule;
        price = this.applyPriceAdjustment(masterPrice, adjustment);
        if (compareAtPrice) {
          compareAtPrice = this.applyPriceAdjustment(compareAtPrice, adjustment);
        }
        priceSource = 'AUTO_ADJUSTED';
      }

      stores.push({
        storeId: mapping.storeId,
        storeName: mapping.store.name,
        price,
        compareAtPrice,
        currency,
        priceSource,
        adjustment
      });
    }

    return {
      productId: product.id,
      productTitle: product.title,
      masterPrice,
      stores
    };
  }

  /**
   * Apply price adjustment rule
   * 
   * Rules:
   * - markup: Increase by percentage or amount
   * - discount: Decrease by percentage or amount
   * - fixed: Set to fixed price
   * 
   * @param basePrice - Original price
   * @param rule - Adjustment rule
   * @returns Adjusted price
   */
  private applyPriceAdjustment(basePrice: number, rule: PriceAdjustmentRule): number {
    if (rule.type === 'fixed') {
      return rule.value;
    }

    if (rule.unit === 'percent') {
      const multiplier = rule.type === 'markup' 
        ? (1 + rule.value / 100) 
        : (1 - rule.value / 100);
      return basePrice * multiplier;
    }

    // Amount adjustment
    if (rule.type === 'markup') {
      return basePrice + rule.value;
    } else {
      return basePrice - rule.value;
    }
  }

  /**
   * Parse price from various formats (Decimal, string, number)
   * 
   * @param price - Price in any format
   * @returns Parsed price as number
   */
  private parsePrice(price: any): number {
    if (price === null || price === undefined) return 0;
    if (typeof price === 'number') return price;
    if (typeof price === 'string') return parseFloat(price) || 0;
    
    // Handle Prisma Decimal type
    if (price && typeof price === 'object' && 'toNumber' in price) {
      return (price as Decimal).toNumber();
    }
    
    return parseFloat(price.toString()) || 0;
  }

  /**
   * Set custom price for store
   * 
   * @param productId - Product ID
   * @param storeId - Store ID
   * @param customPrice - Custom price (null to remove override)
   * @param customCompareAtPrice - Custom compare at price
   * @param currency - Currency code
   */
  async setStorePrice(
    productId: string,
    storeId: string,
    customPrice: number | null,
    customCompareAtPrice?: number | null,
    currency?: string
  ): Promise<void> {
    // Use repository update method
    await storeProductMapRepository.update(storeId, productId, {
      customPrice: customPrice !== null ? new Decimal(customPrice) : null,
      customCompareAtPrice: customCompareAtPrice !== null && customCompareAtPrice !== undefined 
        ? new Decimal(customCompareAtPrice) 
        : null,
      customCurrency: currency,
      // Clear adjustment when setting custom price
      ...(customPrice !== null && { priceAdjustment: null as any })
    });
  }

  /**
   * Set price adjustment rule for store
   * 
   * @param productId - Product ID
   * @param storeId - Store ID
   * @param rule - Adjustment rule (null to remove)
   */
  async setStorePriceAdjustment(
    productId: string,
    storeId: string,
    rule: PriceAdjustmentRule | null
  ): Promise<void> {
    // Use repository update method
    await storeProductMapRepository.update(storeId, productId, {
      priceAdjustment: rule as any,
      // Clear custom price when setting adjustment
      ...(rule !== null && { 
        customPrice: null,
        customCompareAtPrice: null
      })
    });
  }
}

// Export singleton instance
export const productDisplayService = new ProductDisplayService();

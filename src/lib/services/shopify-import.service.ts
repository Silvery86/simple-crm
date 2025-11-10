import { productRepository } from '@/lib/db/repositories/product.repo';
import { downloadImages } from '@/lib/utils/image-download';

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price?: string;
    sku: string;
    inventory_quantity: number;
    featured_image?: string | null | {
      id: number;
      src: string;
      position: number;
      product_id: number;
      variant_ids?: number[];
    };
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    position: number;
    variant_ids?: number[];
  }>;
  options?: Array<{
    name: string;
    position: number;
    values: string[];
  }>;
}

export interface ImportProgress {
  total: number;
  current: number;
  success: number;
  failed: number;
  skipped: number;
  currentProduct?: string;
  logs: string[];
}

export type ProgressCallback = (progress: ImportProgress) => void;

export type DuplicateStrategy = 'overwrite' | 'keepboth' | 'skip';

/**
 * Purpose: Verify if a URL is a Shopify store.
 * Params:
 *   - url: string — The store URL to verify.
 * Returns:
 *   - Promise<boolean> — True if it's a Shopify store.
 */
export async function isShopifyStore(url: string): Promise<boolean> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const testUrl = `${cleanUrl}/products.json?limit=1`;
    
    const response = await fetch(testUrl);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data && Array.isArray(data.products);
  } catch (error) {
    console.error('Error verifying Shopify store:', error);
    return false;
  }
}

/**
 * Purpose: Fetch products from Shopify store with pagination.
 * Params:
 *   - storeUrl: string — The Shopify store URL.
 *   - page: number — Page number (30 products per page).
 * Returns:
 *   - Promise<ShopifyProduct[]> — Array of products from that page.
 * Throws:
 *   - Error — When fetch fails.
 */
export async function fetchShopifyProducts(
  storeUrl: string,
  page: number
): Promise<ShopifyProduct[]> {
  const cleanUrl = storeUrl.replace(/\/$/, '');
  const url = `${cleanUrl}/products.json?page=${page}&limit=30`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data || !Array.isArray(data.products)) {
    throw new Error('Invalid response format from Shopify');
  }
  
  return data.products;
}

/**
 * Purpose: Import Shopify products with rate limiting and progress tracking.
 * Params:
 *   - storeUrl: string — The Shopify store URL.
 *   - startPage: number — Starting page number.
 *   - endPage: number — Ending page number.
 *   - onProgress?: ProgressCallback — Callback for progress updates.
 *   - duplicateStrategy?: DuplicateStrategy — How to handle duplicates (default: 'skip').
 * Returns:
 *   - Promise<ImportProgress> — Final import statistics.
 * Throws:
 *   - Error — When import fails.
 */
export async function importShopifyProducts(
  storeUrl: string,
  startPage: number,
  endPage: number,
  onProgress?: ProgressCallback,
  duplicateStrategy: DuplicateStrategy = 'skip'
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    logs: [],
  };

  // Verify Shopify store
  progress.logs.push(`Verifying Shopify store: ${storeUrl}`);
  onProgress?.(progress);

  const isShopify = await isShopifyStore(storeUrl);
  if (!isShopify) {
    progress.logs.push('❌ Error: Not a valid Shopify store');
    onProgress?.(progress);
    throw new Error('Not a valid Shopify store');
  }

  progress.logs.push('✅ Shopify store verified');
  onProgress?.(progress);

  // Collect all products from all pages first
  const allProducts: ShopifyProduct[] = [];
  
  for (let page = startPage; page <= endPage; page++) {
    try {
      progress.logs.push(`Fetching page ${page}...`);
      onProgress?.(progress);

      const products = await fetchShopifyProducts(storeUrl, page);
      
      if (products.length === 0) {
        progress.logs.push(`Page ${page} is empty, stopping...`);
        onProgress?.(progress);
        break;
      }

      allProducts.push(...products);
      progress.logs.push(`✅ Fetched ${products.length} products from page ${page}`);
      onProgress?.(progress);

      // Delay between page fetches
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      progress.logs.push(`❌ Error fetching page ${page}: ${error.message}`);
      onProgress?.(progress);
    }
  }

  progress.total = allProducts.length;
  progress.logs.push(`\nTotal products to import: ${progress.total}`);
  progress.logs.push(`Importing 10 products every 3 minutes...`);
  onProgress?.(progress);

  // Import products in batches (10 products every 3 minutes = 180 seconds)
  const batchSize = 10;
  const batchDelay = 180000; // 3 minutes in milliseconds

  for (let i = 0; i < allProducts.length; i += batchSize) {
    const batch = allProducts.slice(i, Math.min(i + batchSize, allProducts.length));
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    progress.logs.push(`\n--- Batch ${batchNumber} (Products ${i + 1}-${Math.min(i + batchSize, allProducts.length)}) ---`);
    onProgress?.(progress);

    // Process batch
    for (const shopifyProduct of batch) {
      progress.current++;
      progress.currentProduct = shopifyProduct.title;
      
      try {
        progress.logs.push(`[${progress.current}/${progress.total}] Importing: ${shopifyProduct.title}`);
        onProgress?.(progress);

        // Create product ID from Shopify ID
        const productId = `shopify-${shopifyProduct.id}`;

        // Download images
        let imagePaths: string[] = [];
        if (shopifyProduct.images && shopifyProduct.images.length > 0) {
          progress.logs.push(`  📷 Downloading ${shopifyProduct.images.length} images...`);
          onProgress?.(progress);

          const imageUrls = shopifyProduct.images.map(img => img.src);
          imagePaths = await downloadImages(imageUrls, productId, 500);
          
          progress.logs.push(`  ✅ Downloaded ${imagePaths.length}/${imageUrls.length} images`);
          onProgress?.(progress);
        }

        // Extract categories from tags and product_type
        const categories: string[] = [
          ...shopifyProduct.tags,
          shopifyProduct.product_type,
        ].filter(Boolean);

        // Check for duplicate by handle
        const { prisma } = await import('@/lib/db/client');
        const existingProduct = shopifyProduct.handle 
          ? await prisma.product.findFirst({
              where: { handle: shopifyProduct.handle },
              select: { id: true, title: true },
            } as any)
          : null;

        let product;

        if (existingProduct) {
          if (duplicateStrategy === 'skip') {
            progress.skipped++;
            progress.logs.push(`  ⏭️ Skipped: Product with handle "${shopifyProduct.handle}" already exists`);
            onProgress?.(progress);
            continue;
          } else if (duplicateStrategy === 'overwrite') {
            progress.logs.push(`  🔄 Overwriting existing product: "${existingProduct.title}"...`);
            onProgress?.(progress);
            
            // Delete old variants first
            await prisma.productVariant.deleteMany({
              where: { productId: existingProduct.id },
            });
            
            // Update product
            product = await productRepository.update(existingProduct.id, {
              title: shopifyProduct.title,
              description: shopifyProduct.body_html || null,
              vendor: shopifyProduct.vendor || null,
              options: shopifyProduct.options || null,
              categories,
              images: imagePaths,
              rawPayload: shopifyProduct as any,
            });
            
            progress.logs.push(`  ✅ Product overwritten: "${shopifyProduct.title}"`);
          } else if (duplicateStrategy === 'keepboth') {
            // Modify handle to make it unique
            const timestamp = Date.now();
            const newHandle = `${shopifyProduct.handle}-${timestamp}`;
            
            progress.logs.push(`  📦 Creating duplicate with new handle: "${newHandle}"...`);
            onProgress?.(progress);
            
            product = await productRepository.create({
              title: `${shopifyProduct.title} (Copy ${timestamp})`,
              description: shopifyProduct.body_html || null,
              brandId: null,
              handle: newHandle,
              vendor: shopifyProduct.vendor || null,
              options: shopifyProduct.options || null,
              isShared: true,
              categories,
              images: imagePaths,
              rawPayload: shopifyProduct as any,
            });
            
            progress.logs.push(`  ✅ Duplicate created: "${product.title}"`);
          }
        } else {
          // No duplicate, create new
          progress.logs.push(`  💾 Saving product to database: "${shopifyProduct.title}"...`);
          onProgress?.(progress);
          
          product = await productRepository.create({
            title: shopifyProduct.title,
            description: shopifyProduct.body_html || null,
            brandId: null,
            handle: shopifyProduct.handle || null,
            vendor: shopifyProduct.vendor || null,
            options: shopifyProduct.options || null,
            isShared: true, // Mark as shared catalog
            categories,
            images: imagePaths,
            rawPayload: shopifyProduct as any,
          });
        }

        if (!product) {
          throw new Error('Failed to create or update product');
        }

        progress.logs.push(`  ✅ Product saved successfully: "${shopifyProduct.title}" (ID: ${product.id})`);
        onProgress?.(progress);

        // Create variants
        if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
          progress.logs.push(`  📦 Creating ${shopifyProduct.variants.length} variants for "${shopifyProduct.title}"...`);
          onProgress?.(progress);

          // Import variants would go here (using prisma directly for now)
          const { prisma } = await import('@/lib/db/client');
          
          for (const variant of shopifyProduct.variants) {
            // Extract image URL from featured_image object or use as string
            let featuredImageUrl: string | null = null;
            if (variant.featured_image) {
              if (typeof variant.featured_image === 'string') {
                featuredImageUrl = variant.featured_image;
              } else if (typeof variant.featured_image === 'object' && variant.featured_image.src) {
                featuredImageUrl = variant.featured_image.src;
              }
            }
            
            await prisma.productVariant.create({
              data: {
                productId: product.id,
                sku: variant.sku || null,
                price: variant.price ? parseFloat(variant.price) : null,
                compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
                currency: 'USD',
                featuredImage: featuredImageUrl,
                rawPayload: variant,
              } as any, // Cast to any until Prisma regenerates
            });
          }

          progress.logs.push(`  ✅ All variants created for "${shopifyProduct.title}"`);
          onProgress?.(progress);
        }

        progress.success++;
        progress.logs.push(`\n✅ Import completed for: "${shopifyProduct.title}"\n`);
        onProgress?.(progress);

      } catch (error: any) {
        progress.failed++;
        progress.logs.push(`  ❌ Failed: ${shopifyProduct.title} - ${error.message}`);
        onProgress?.(progress);
      }
    }

    // Wait 3 minutes before next batch (except for last batch)
    if (i + batchSize < allProducts.length) {
      const nextBatchIn = batchDelay / 1000; // seconds
      progress.logs.push(`\n⏳ Waiting ${nextBatchIn} seconds before next batch...`);
      onProgress?.(progress);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  progress.logs.push(`\n=== Import Complete ===`);
  progress.logs.push(`✅ Success: ${progress.success}`);
  progress.logs.push(`⏭️ Skipped: ${progress.skipped}`);
  progress.logs.push(`❌ Failed: ${progress.failed}`);
  progress.logs.push(`📊 Total: ${progress.total}`);
  onProgress?.(progress);

  return progress;
}

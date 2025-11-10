import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/**
 * Endpoint: POST /api/shopify/check-duplicates
 * Purpose: Check for duplicate products by handle or SKU before import.
 * Request Body:
 *   - products: Array<{ handle: string, skus: string[] }> — Products to check
 * Responses:
 *   - 200: { success: true, duplicates: Array } — List of duplicates found
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Products array is required',
          },
        },
        { status: 400 }
      );
    }

    // Collect all handles and SKUs
    const handles = products.map(p => p.handle).filter(Boolean);
    const allSkus = products.flatMap(p => p.skus || []).filter(Boolean);

    // Check for existing products by handle
    const existingByHandle = await prisma.product.findMany({
      where: {
        handle: { in: handles },
      },
      select: {
        id: true,
        title: true,
        handle: true,
        variants: {
          select: {
            sku: true,
          },
        },
      },
    } as any);

    // Check for existing variants by SKU
    const existingBySku = await prisma.productVariant.findMany({
      where: {
        sku: { in: allSkus },
      },
      select: {
        id: true,
        sku: true,
        product: {
          select: {
            id: true,
            title: true,
            handle: true,
          },
        },
      },
    });

    // Build duplicate map
    const duplicates = products.map(product => {
      const handleMatch = existingByHandle.find((p: any) => p.handle === product.handle);
      const skuMatches = existingBySku.filter(v => 
        product.skus?.includes(v.sku || '')
      );

      if (handleMatch || skuMatches.length > 0) {
        return {
          shopifyProduct: product,
          existingProduct: handleMatch,
          skuConflicts: skuMatches.map(v => ({
            sku: v.sku,
            existingProductTitle: v.product.title,
          })),
        };
      }
      return null;
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        duplicates,
        totalChecked: products.length,
        duplicatesFound: duplicates.length,
      },
    });
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CHECK_DUPLICATES_FAILED',
          message: error.message || 'Failed to check duplicates',
        },
      },
      { status: 500 }
    );
  }
}

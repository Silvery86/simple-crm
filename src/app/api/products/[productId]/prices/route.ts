/**
 * API Route: GET /api/products/[productId]/prices
 * 
 * Purpose: Compare product prices across all stores
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "productId": string,
 *     "productTitle": string,
 *     "masterPrice": number,
 *     "stores": [
 *       {
 *         "storeId": string,
 *         "storeName": string,
 *         "price": number,
 *         "compareAtPrice": number | null,
 *         "currency": string,
 *         "priceSource": "MASTER" | "STORE_OVERRIDE" | "AUTO_ADJUSTED",
 *         "adjustment": {
 *           "type": string,
 *           "value": number,
 *           "unit": string
 *         } | null
 *       }
 *     ]
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { productDisplayService } from '@/lib/services/product-display.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    // Get price comparison across all stores
    const priceComparison = await productDisplayService.compareProductPrices(productId);

    if (!priceComparison) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: priceComparison
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API] Get product prices error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to get product prices',
      details: error.message
    }, { status: 500 });
  }
}

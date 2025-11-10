import { NextRequest, NextResponse } from 'next/server';
import { importShopifyProducts } from '@/lib/services/shopify-import.service';

/**
 * Endpoint: POST /api/shopify/import
 * Purpose: Import products from Shopify store.
 * Request Body:
 *   - url: string — Shopify store URL
 *   - startPage: number — Starting page number
 *   - endPage: number — Ending page number
 * Responses:
 *   - 200: { success: true, data: ImportProgress } — Import completed
 *   - 400: { success: false, error: ErrorObject } — Invalid request
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, startPage, endPage, duplicateStrategy = 'skip' } = body;

    if (!url || !startPage || !endPage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL, startPage, and endPage are required',
          },
        },
        { status: 400 }
      );
    }

    if (startPage < 1 || endPage < startPage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid page range',
          },
        },
        { status: 400 }
      );
    }

    // Note: This is a synchronous import. For production, use a background job queue.
    const result = await importShopifyProducts(url, startPage, endPage, undefined, duplicateStrategy);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error importing products:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error.message || 'Failed to import products',
        },
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { importShopifyProducts, isShopifyStore } from '@/lib/services/shopify-import.service';

/**
 * Endpoint: POST /api/shopify/verify
 * Purpose: Verify if a URL is a Shopify store.
 * Request Body:
 *   - url: string — Store URL to verify
 * Responses:
 *   - 200: { success: true, isShopify: boolean } — Verification result
 *   - 400: { success: false, error: ErrorObject } — Invalid request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL is required',
          },
        },
        { status: 400 }
      );
    }

    const isShopify = await isShopifyStore(url);

    return NextResponse.json({
      success: true,
      isShopify,
    });
  } catch (error: any) {
    console.error('Error verifying Shopify store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VERIFY_FAILED',
          message: error.message || 'Failed to verify store',
        },
      },
      { status: 500 }
    );
  }
}

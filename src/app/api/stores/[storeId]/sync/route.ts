/**
 * API Route: POST /api/stores/[storeId]/sync
 * 
 * Purpose: Trigger manual product sync from WooCommerce store to CRM
 * 
 * Request Body (optional):
 * {
 *   "pageSize": number,    // Products per page (default: 100)
 *   "maxPages": number,    // Max pages to sync (default: unlimited)
 *   "modifiedOnly": boolean // Only sync modified products (default: false)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "total": number,      // Total products processed
 *     "created": number,    // New products created
 *     "updated": number,    // Existing products updated
 *     "failed": number,     // Products that failed
 *     "errors": Array       // Error details
 *   },
 *   "message": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { wooCommerceSyncService } from '@/lib/services/woocommerce-sync.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Parse request body (optional sync options)
    let syncOptions = {};
    try {
      const body = await request.json();
      syncOptions = {
        pageSize: body.pageSize,
        maxPages: body.maxPages,
      };
    } catch {
      // Body is optional, use defaults
    }

    // Check if modifiedOnly flag is set
    const url = new URL(request.url);
    const modifiedOnly = url.searchParams.get('modifiedOnly') === 'true';

    // Execute sync
    let result;
    if (modifiedOnly) {
      result = await wooCommerceSyncService.syncModifiedProducts(storeId);
    } else {
      result = await wooCommerceSyncService.syncStoreProducts(storeId, syncOptions);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Sync completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API] Store sync error:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 404 });
    }

    if (error.message.includes('not active') || error.message.includes('credentials')) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to sync store products',
      details: error.message
    }, { status: 500 });
  }
}

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
import { storeRepository } from '@/lib/db/repositories/store.repo';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Check if storeId is empty
    if (!storeId || storeId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    // Verify store exists
    const store = await storeRepository.findById(storeId);
    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    // Parse request body (optional sync options)
    let body: any = {};
    let syncOptions: any = {};
    
    try {
      body = await request.json();
    } catch (jsonError: any) {
      // Handle JSON parse errors
      if (jsonError.name === 'SyntaxError') {
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON body'
        }, { status: 400 });
      }
      // Body is optional, use defaults
      body = {};
    }

    // Validate pageSize
    if (body.pageSize !== undefined) {
      if (typeof body.pageSize !== 'number' || body.pageSize <= 0) {
        return NextResponse.json({
          success: false,
          error: 'pageSize must be a positive number'
        }, { status: 400 });
      }
      syncOptions.pageSize = body.pageSize;
    } else {
      syncOptions.pageSize = 100; // default
    }

    // Validate maxPages
    if (body.maxPages !== undefined) {
      if (typeof body.maxPages !== 'number' || body.maxPages <= 0) {
        return NextResponse.json({
          success: false,
          error: 'maxPages must be a positive number'
        }, { status: 400 });
      }
      syncOptions.maxPages = body.maxPages;
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

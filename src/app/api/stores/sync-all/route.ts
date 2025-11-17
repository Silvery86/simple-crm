/**
 * API Route: POST /api/stores/sync-all
 * 
 * Purpose: Trigger sync for all active WooCommerce stores
 * 
 * Request Body (optional):
 * {
 *   "pageSize": number,    // Products per page (default: 100)
 *   "maxPages": number,    // Max pages to sync per store (default: unlimited)
 *   "modifiedOnly": boolean // Only sync modified products (default: false)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "stores": [
 *       {
 *         "storeId": string,
 *         "storeName": string,
 *         "result": {
 *           "total": number,
 *           "created": number,
 *           "updated": number,
 *           "failed": number
 *         }
 *       }
 *     ],
 *     "summary": {
 *       "totalStores": number,
 *       "successfulStores": number,
 *       "failedStores": number,
 *       "totalProducts": number
 *     }
 *   },
 *   "message": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { wooCommerceSyncService } from '@/lib/services/woocommerce-sync.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';

export async function POST(request: NextRequest) {
  try {
    // Parse request body (optional sync options)
    let syncOptions: any = {};
    let modifiedOnly = false;
    
    try {
      const body = await request.json();
      syncOptions = {
        pageSize: body.pageSize,
        maxPages: body.maxPages,
      };
      modifiedOnly = body.modifiedOnly === true;
    } catch {
      // Body is optional, use defaults
    }

    // Get all active WooCommerce stores
    const storesResult = await storeRepository.list({
      platform: 'WOO',
      status: 'active'
    });

    const activeStores = storesResult.data;

    if (activeStores.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stores: [],
          summary: {
            totalStores: 0,
            successfulStores: 0,
            failedStores: 0,
            totalProducts: 0
          }
        },
        message: 'No active WooCommerce stores found'
      }, { status: 200 });
    }

    console.log(`[API] Starting sync for ${activeStores.length} stores...`);

    // Sync each store
    const results = [];
    let successfulStores = 0;
    let failedStores = 0;
    let totalProducts = 0;

    for (const store of activeStores) {
      try {
        console.log(`[API] Syncing store: ${store.name}`);
        
        let result;
        if (modifiedOnly) {
          result = await wooCommerceSyncService.syncModifiedProducts(store.id);
        } else {
          result = await wooCommerceSyncService.syncStoreProducts(store.id, syncOptions);
        }

        results.push({
          storeId: store.id,
          storeName: store.name,
          success: true,
          result: {
            total: result.total,
            created: result.created,
            updated: result.updated,
            failed: result.failed
          }
        });

        successfulStores++;
        totalProducts += result.total;

      } catch (error: any) {
        console.error(`[API] Failed to sync store ${store.name}:`, error.message);
        
        results.push({
          storeId: store.id,
          storeName: store.name,
          success: false,
          error: error.message
        });

        failedStores++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stores: results,
        summary: {
          totalStores: activeStores.length,
          successfulStores,
          failedStores,
          totalProducts
        }
      },
      message: `Sync completed for ${successfulStores}/${activeStores.length} stores`
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API] Sync all stores error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to sync stores',
      details: error.message
    }, { status: 500 });
  }
}

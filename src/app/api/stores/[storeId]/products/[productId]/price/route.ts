/**
 * API Route: PUT /api/stores/[storeId]/products/[productId]/price
 * 
 * Purpose: Set custom price or price adjustment rule for product on specific store
 * 
 * Request Body (one of):
 * 
 * Option 1 - Custom Price:
 * {
 *   "type": "custom",
 *   "price": number,           // Custom price (required)
 *   "compareAtPrice": number,  // Compare at price (optional)
 *   "currency": string         // Currency code (optional, default: store currency)
 * }
 * 
 * Option 2 - Price Adjustment:
 * {
 *   "type": "adjustment",
 *   "adjustmentType": "markup" | "discount" | "fixed",
 *   "value": number,
 *   "unit": "percent" | "amount"
 * }
 * 
 * Option 3 - Clear Override (use master price):
 * {
 *   "type": "clear"
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "storeId": string,
 *     "productId": string,
 *     "displayPrice": number,
 *     "priceSource": "MASTER" | "STORE_OVERRIDE" | "AUTO_ADJUSTED"
 *   },
 *   "message": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { productDisplayService } from '@/lib/services/product-display.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { productRepository } from '@/lib/db/repositories/product.repo';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;

    // Verify store exists
    const store = await storeRepository.findById(storeId);
    if (!store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    // Verify product exists
    const product = await productRepository.findById(productId);
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      if (jsonError.name === 'SyntaxError') {
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON body'
        }, { status: 400 });
      }
      throw jsonError;
    }

    if (!body.type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: type'
      }, { status: 400 });
    }

    // Handle different pricing types
    switch (body.type) {
      case 'custom': {
        // Set custom price
        if (body.price === undefined || body.price === null) {
          return NextResponse.json({
            success: false,
            error: 'Custom price requires "price" field'
          }, { status: 400 });
        }

        // Validate price is not negative
        if (typeof body.price !== 'number' || body.price < 0) {
          return NextResponse.json({
            success: false,
            error: 'price must be a non-negative number'
          }, { status: 400 });
        }

        await productDisplayService.setStorePrice(
          productId,
          storeId,
          body.price,
          body.compareAtPrice || null,
          body.currency || undefined
        );

        break;
      }

      case 'adjustment': {
        // Set price adjustment rule
        if (!body.adjustmentType || body.value === undefined || !body.unit) {
          return NextResponse.json({
            success: false,
            error: 'Price adjustment requires: adjustmentType, value, unit'
          }, { status: 400 });
        }

        // Validate adjustmentType enum
        const validAdjustmentTypes = ['markup', 'discount', 'fixed'];
        if (!validAdjustmentTypes.includes(body.adjustmentType)) {
          return NextResponse.json({
            success: false,
            error: `adjustmentType must be one of: ${validAdjustmentTypes.join(', ')}`
          }, { status: 400 });
        }

        // Validate unit enum
        const validUnits = ['percent', 'amount'];
        if (!validUnits.includes(body.unit)) {
          return NextResponse.json({
            success: false,
            error: `unit must be one of: ${validUnits.join(', ')}`
          }, { status: 400 });
        }

        await productDisplayService.setStorePriceAdjustment(
          productId,
          storeId,
          {
            type: body.adjustmentType,
            value: body.value,
            unit: body.unit
          }
        );

        break;
      }

      case 'clear': {
        // Clear both custom price and adjustment (use master price)
        await productDisplayService.setStorePrice(
          productId,
          storeId,
          null,
          null,
          undefined
        );

        await productDisplayService.setStorePriceAdjustment(
          productId,
          storeId,
          null
        );

        break;
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Invalid type: ${body.type}. Must be "custom", "adjustment", or "clear"`
        }, { status: 400 });
    }

    // Get updated product with price
    const updatedProduct = await productDisplayService.getProductWithPrice(
      productId,
      { storeId }
    );

    if (!updatedProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        storeId,
        productId,
        displayPrice: updatedProduct.displayPrice,
        priceSource: updatedProduct.priceSource
      },
      message: `Price ${body.type === 'clear' ? 'cleared' : 'updated'} successfully`
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API] Set store price error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to update price',
      details: error.message
    }, { status: 500 });
  }
}

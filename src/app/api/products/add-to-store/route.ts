import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/**
 * Purpose: Add shared products to a specific store.
 * Method: POST
 * Body:
 *   - productId: string — Product ID to add
 *   - storeId: string — Target store ID
 *   - externalId?: string — External ID in store platform (optional, defaults to productId)
 * Returns:
 *   - ApiResponse<StoreProductMap> — Created mapping or error.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, storeId, externalId } = body;

    // Validation
    if (!productId || !storeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            key: 'toast.error.missingFields',
            message: 'Product ID and Store ID are required',
          },
        },
        { status: 400 }
      );
    }

    // Check if product exists and is shared
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isShared: true, title: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            key: 'toast.error.productNotFound',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    if (!product.isShared) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_SHARED',
            key: 'toast.error.productNotShared',
            message: 'Product is not in shared catalog',
          },
        },
        { status: 400 }
      );
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, isActive: true },
    });

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            key: 'toast.error.storeNotFound',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    if (!store.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORE_INACTIVE',
            key: 'toast.error.storeInactive',
            message: 'Store is not active',
          },
        },
        { status: 400 }
      );
    }

    // Check if already mapped
    const existingMap = await prisma.storeProductMap.findFirst({
      where: {
        storeId,
        productId,
      },
    });

    if (existingMap) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_MAPPED',
            key: 'toast.error.productAlreadyInStore',
            message: 'Product is already added to this store',
          },
        },
        { status: 409 }
      );
    }

    // Create mapping
    const mapping = await prisma.storeProductMap.create({
      data: {
        storeId,
        productId,
        externalId: externalId || productId, // Default to productId if not provided
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: mapping,
      meta: {
        storeName: store.name,
        productTitle: product.title,
      },
    });
  } catch (error: any) {
    console.error('Error adding product to store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADD_TO_STORE_FAILED',
          key: 'toast.error.saveFailed',
          message: error.message || 'Failed to add product to store',
        },
      },
      { status: 500 }
    );
  }
}

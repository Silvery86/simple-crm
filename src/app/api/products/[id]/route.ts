import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/db/repositories/product.repo';

/**
 * Endpoint: GET /api/products/[id]
 * Purpose: Get single product by ID with all relations.
 * Params:
 *   - id: string — Product ID
 * Responses:
 *   - 200: { success: true, data: Product } — Success
 *   - 404: { success: false, error: ErrorObject } — Product not found
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await productRepository.findById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            key: 'toast.error.loadFailed',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_PRODUCT_FAILED',
          key: 'toast.error.loadFailed',
          message: error.message || 'Failed to fetch product',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint: PUT /api/products/[id]
 * Purpose: Update product by ID.
 * Params:
 *   - id: string — Product ID
 * Request Body:
 *   - title?: string — Product title
 *   - description?: string — Product description
 *   - brandId?: string — Brand identifier
 *   - rawPayload?: object — Raw data from source platform
 * Responses:
 *   - 200: { success: true, data: Product } — Updated successfully
 *   - 404: { success: false, error: ErrorObject } — Product not found
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingProduct = await productRepository.findById(id);

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            key: 'toast.error.saveFailed',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.brandId !== undefined) updateData.brandId = body.brandId;
    if (body.rawPayload !== undefined) updateData.rawPayload = body.rawPayload;

    const product = await productRepository.update(id, updateData);

    return NextResponse.json({
      success: true,
      data: product,
      meta: {
        message: 'Product updated successfully',
      },
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_PRODUCT_FAILED',
          key: 'toast.error.saveFailed',
          message: error.message || 'Failed to update product',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint: DELETE /api/products/[id]
 * Purpose: Delete product by ID.
 * Params:
 *   - id: string — Product ID
 * Responses:
 *   - 200: { success: true, data: null } — Deleted successfully
 *   - 404: { success: false, error: ErrorObject } — Product not found
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await productRepository.findById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            key: 'toast.error.deleteFailed',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    await productRepository.delete(id);

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_PRODUCT_FAILED',
          key: 'toast.error.deleteFailed',
          message: error.message || 'Failed to delete product',
        },
      },
      { status: 500 }
    );
  }
}

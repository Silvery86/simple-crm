import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/db/repositories/product.repo';

/**
 * Endpoint: GET /api/products
 * Purpose: Get list of all products with optional filters and pagination.
 * Query Params:
 *   - page?: number — Page number (default: 1)
 *   - limit?: number — Items per page (default: 20)
 *   - brandId?: string — Filter by brand ID
 *   - storeId?: string — Filter by store ID
 *   - search?: string — Search in title and description
 *   - isShared?: boolean — Filter by shared catalog
 *   - categories?: string[] — Filter by categories
 *   - minPrice?: number — Minimum price filter
 *   - maxPrice?: number — Maximum price filter
 * Responses:
 *   - 200: { success: true, data: Product[], meta: Pagination } — Success
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const search = searchParams.get('search') || undefined;
    
    // Shared catalog filters
    const isSharedParam = searchParams.get('isShared');
    const isShared = isSharedParam === 'true' ? true : isSharedParam === 'false' ? false : undefined;
    const categories = searchParams.getAll('categories');
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;

    const result = await productRepository.list({
      page,
      limit,
      brandId,
      storeId,
      search,
      isShared,
      categories: categories.length > 0 ? categories : undefined,
      minPrice,
      maxPrice,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_PRODUCTS_FAILED',
          key: 'toast.error.loadFailed',
          message: error.message || 'Failed to fetch products',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint: POST /api/products
 * Purpose: Create a new product.
 * Request Body:
 *   - title: string — Product title (required)
 *   - description?: string — Product description
 *   - brandId?: string — Brand identifier
 *   - rawPayload: object — Raw data from source platform (required)
 * Responses:
 *   - 201: { success: true, data: Product } — Created successfully
 *   - 400: { success: false, error: ErrorObject } — Validation error
 *   - 500: { success: false, error: ErrorObject } — Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { title, description, brandId, rawPayload } = body;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            key: 'validation.required',
            message: 'Product title is required',
          },
        },
        { status: 400 }
      );
    }

    if (!rawPayload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            key: 'validation.required',
            message: 'Product rawPayload is required',
          },
        },
        { status: 400 }
      );
    }

    const productData: any = {
      title,
      description: description || null,
      brandId: brandId || null,
      rawPayload,
    };

    const product = await productRepository.create(productData);

    return NextResponse.json(
      {
        success: true,
        data: product,
        meta: {
          message: 'Product created successfully',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_PRODUCT_FAILED',
          key: 'toast.error.saveFailed',
          message: error.message || 'Failed to create product',
        },
      },
      { status: 500 }
    );
  }
}

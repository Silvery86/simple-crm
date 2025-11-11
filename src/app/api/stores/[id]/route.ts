import { NextRequest, NextResponse } from 'next/server';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { encrypt } from '@/lib/utils/encryption';

/**
 * Purpose: Get single store by ID.
 * Method: GET
 * Params:
 *   - id: string — Store ID
 * Returns:
 *   - ApiResponse<Store> — Store data or error.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storeData = await storeRepository.findById(id);

    if (!storeData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORE_NOT_FOUND',
            key: 'toast.error.loadFailed',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Replace consumerSecret with placeholder for security
    const store = {
      ...storeData,
      consumerSecret: (storeData as any).consumerSecret ? '****************' : '',
    };

    return NextResponse.json({
      success: true,
      data: store,
    });
  } catch (error: any) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_STORE_FAILED',
          key: 'toast.error.loadFailed',
          message: error.message || 'Failed to fetch store',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Purpose: Update store by ID.
 * Method: PUT
 * Params:
 *   - id: string — Store ID
 * Body:
 *   - name?: string — Store name
 *   - platform?: 'WOO' | 'SHOPIFY' — Platform
 *   - domain?: string — Domain
 *   - isActive?: boolean — Status
 *   - description?: string — Description
 *   - logo?: string — Logo URL
 *   - country?: string — Country
 *   - currency?: string — Currency
 *   - consumerKey?: string — Consumer key
 *   - consumerSecret?: string — Consumer secret
 * Returns:
 *   - ApiResponse<Store> — Updated store or error.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if store exists using repository
    const existingStore = await storeRepository.findById(id);

    if (!existingStore) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORE_NOT_FOUND',
            key: 'toast.error.saveFailed',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Validate platform if provided
    if (body.platform && !['WOO', 'SHOPIFY'].includes(body.platform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            key: 'validation.pattern',
            message: 'Invalid platform. Must be WOO or SHOPIFY',
          },
        },
        { status: 400 }
      );
    }

    // Check domain uniqueness if domain is being changed
    if (body.domain && body.domain !== existingStore.domain) {
      const domainExists = await storeRepository.findByDomain(body.domain);

      if (domainExists && domainExists.id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DOMAIN_EXISTS',
              key: 'toast.error.saveFailed',
              message: 'A store with this domain already exists',
            },
          },
          { status: 409 }
        );
      }
    }

    // Validate WooCommerce credentials if they are being updated
    if (body.platform === 'WOO' && body.consumerKey && body.consumerSecret && body.consumerSecret !== '****************') {
      const { validateWooCommerceCredentials } = await import('@/lib/utils/store-credentials');
      const validation = await validateWooCommerceCredentials(
        body.domain,
        body.consumerKey,
        body.consumerSecret
      );
      
      if (!validation.success) {
        // Return error response - don't update database
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'WOOCOMMERCE_CONNECTION_FAILED',
              key: 'toast.error.connectionFailed',
              message: validation.message || 'Failed to connect to WooCommerce',
            },
            meta: {
              connectionStatus: 'failed',
              message: validation.message,
            },
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data with encrypted consumer secret
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.consumerKey !== undefined) updateData.consumerKey = body.consumerKey;

    // Only update consumerSecret if it's changed (not the placeholder)
    if (body.consumerSecret && body.consumerSecret !== '****************') {
      updateData.consumerSecret = encrypt(body.consumerSecret);
    }

    const store = await storeRepository.update(id, updateData);

    return NextResponse.json({
      success: true,
      data: store,
      meta: {
        connectionStatus: 'connected',
        message: 'Store updated successfully!',
      },
    });
  } catch (error: any) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_STORE_FAILED',
          key: 'toast.error.saveFailed',
          message: error.message || 'Failed to update store',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Purpose: Delete store by ID.
 * Method: DELETE
 * Params:
 *   - id: string — Store ID
 * Returns:
 *   - ApiResponse<void> — Success or error.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if store exists using repository
    const store = await storeRepository.findById(id);

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STORE_NOT_FOUND',
            key: 'toast.error.deleteFailed',
            message: 'Store not found',
          },
        },
        { status: 404 }
      );
    }

    // Delete store using repository
    await storeRepository.delete(id);

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_STORE_FAILED',
          key: 'toast.error.deleteFailed',
          message: error.message || 'Failed to delete store',
        },
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { encrypt } from '@/lib/utils/encryption';
import { validateWooCommerceCredentials } from '@/lib/utils/store-credentials';
import { validateStoreForm } from '@/lib/zod/store.schema';

/**
 * Purpose: Get list of all stores with optional filters.
 * Method: GET
 * Returns:
 *   - ApiResponse<Store[]> — List of stores or error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search') || undefined;

    // Use repository pattern
    const result = await storeRepository.list({
      page: 1,
      limit: 1000,
      platform,
      status: isActive === 'true' ? 'active' : isActive === 'false' ? 'inactive' : undefined,
      search,
    });

    // Remove consumerSecret from response for security
    const sanitizedStores = result.data.map((store: any) => {
      const { consumerSecret, ...rest } = store;
      return rest;
    });

    return NextResponse.json({
      success: true,
      data: sanitizedStores,
      meta: {
        total: result.meta.total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_STORES_FAILED',
          key: 'toast.error.loadFailed',
          message: error.message || 'Failed to fetch stores',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Purpose: Create a new store.
 * Method: POST
 * Body:
 *   - name: string — Store name
 *   - platform: 'WOO' | 'SHOPIFY' — E-commerce platform
 *   - domain: string — Store domain
 *   - isActive?: boolean — Store status
 *   - description?: string — Store description
 *   - logo?: string — Logo URL
 *   - country?: string — Country code
 *   - currency?: string — Currency code
 *   - consumerKey?: string — WooCommerce consumer key
 *   - consumerSecret?: string — WooCommerce consumer secret
 * Returns:
 *   - ApiResponse<Store> — Created store or error.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validation = validateStoreForm(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            key: firstError.message,
            message: firstError.message,
            fields: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      name,
      platform,
      domain,
      isActive = true,
      description,
      logo,
      country,
      currency = 'USD',
      consumerKey,
      consumerSecret,
    } = validation.data;

    // Validate platform
    if (!['WOO', 'SHOPIFY'].includes(platform)) {
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

    // Check if domain already exists using repository
    const existingStore = await storeRepository.findByDomain(domain);

    if (existingStore) {
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

    // Validate WooCommerce credentials if provided
    if (platform === 'WOO' && consumerKey && consumerSecret) {
      const validation = await validateWooCommerceCredentials(
        domain,
        consumerKey,
        consumerSecret
      );
      
      if (!validation.success) {
        // Return error response - don't save to database
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

    // Create store using repository with encrypted consumer secret
    const storeData: any = {
      name,
      platform,
      domain,
      isActive,
      description: description || null,
      logo: logo || null,
      country: country || null,
      currency,
      consumerKey: consumerKey || null,
      consumerSecret: consumerSecret ? encrypt(consumerSecret) : null,
      settings: null,
    };
    
    const store = await storeRepository.create(storeData);

    return NextResponse.json(
      {
        success: true,
        data: store,
        meta: {
          connectionStatus: 'connected',
          message: 'WooCommerce connection successful!',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_STORE_FAILED',
          key: 'toast.error.saveFailed',
          message: error.message || 'Failed to create store',
        },
      },
      { status: 500 }
    );
  }
}

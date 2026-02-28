import { storeRepository } from '@/lib/db/repositories/store.repo';
import { encrypt } from '@/lib/utils/encryption';
import {
  validateWooCommerceCredentials,
} from '@/lib/utils/store-credentials';
import type { StoreFormData } from '@/lib/zod/store.schema';

export interface StoreListParams {
  page?: number;
  limit?: number;
  platform?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateStoreResult {
  store: any;
  connectionStatus: 'connected' | 'skipped';
  message?: string;
}

/**
 * Purpose: Orchestrate store business logic including WooCommerce credential validation and encryption.
 * Responsibility: Business rules, credential encryption, connection testing, repository delegation.
 * Rules: MAY only call Repositories — never Prisma directly.
 */
class StoreService {
  /**
   * Purpose: List stores with optional filtering and pagination.
   * Params:
   *   - params: StoreListParams — Filter and pagination options.
   * Returns:
   *   - Promise<PaginatedResult<Store>> — Paginated store list.
   */
  async list(params: StoreListParams = {}) {
    const result = await storeRepository.list({
      page: params.page ?? 1,
      limit: params.limit ?? 1000,
      platform: params.platform,
      status: params.isActive === true ? 'active' : params.isActive === false ? 'inactive' : undefined,
      search: params.search,
    });

    // Remove consumerSecret from response for security
    const sanitizedData = result.data.map((store: any) => {
      const { consumerSecret, ...rest } = store;
      return rest;
    });

    return { ...result, data: sanitizedData };
  }

  /**
   * Purpose: Find a single store by its ID (without exposing consumerSecret).
   * Params:
   *   - id: string — Store identifier.
   * Returns:
   *   - Promise<Store | null> — Store or null if not found.
   */
  async findById(id: string) {
    const store = await storeRepository.findById(id);
    if (!store) return null;
    const { consumerSecret, ...rest } = store as any;
    return rest;
  }

  /**
   * Purpose: Create a new store with WooCommerce credential validation and encryption.
   * Params:
   *   - data: StoreFormData — Validated store form data.
   * Returns:
   *   - Promise<CreateStoreResult> — Created store with connection status.
   * Throws:
   *   - Error — When domain already exists or WooCommerce connection fails.
   */
  async create(data: StoreFormData): Promise<CreateStoreResult> {
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
    } = data;

    // Check for domain uniqueness
    const existing = await storeRepository.findByDomain(domain);
    if (existing) {
      throw new Error('A store with this domain already exists');
    }

    let connectionStatus: 'connected' | 'skipped' = 'skipped';
    let connectionMessage: string | undefined;

    // Validate WooCommerce credentials before saving
    if (platform === 'WOO' && consumerKey && consumerSecret) {
      const validation = await validateWooCommerceCredentials(domain, consumerKey, consumerSecret);
      if (!validation.success) {
        throw new Error(validation.message || 'Failed to connect to WooCommerce');
      }
      connectionStatus = 'connected';
      connectionMessage = 'WooCommerce connection successful!';
    }

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

    return { store, connectionStatus, message: connectionMessage };
  }

  /**
   * Purpose: Update an existing store, re-validating WooCommerce credentials if changed.
   * Params:
   *   - id: string — Store identifier.
   *   - data: Partial<StoreFormData> — Partial update data.
   * Returns:
   *   - Promise<CreateStoreResult> — Updated store with connection status.
   * Throws:
   *   - Error — When store not found or WooCommerce connection fails.
   */
  async update(id: string, data: Partial<StoreFormData>): Promise<CreateStoreResult> {
    const existing = await storeRepository.findById(id);
    if (!existing) {
      throw new Error('Store not found');
    }

    let connectionStatus: 'connected' | 'skipped' = 'skipped';
    let connectionMessage: string | undefined;
    let encryptedSecret: string | undefined;

    const { consumerKey, consumerSecret, ...rest } = data;

    // Re-validate and re-encrypt only if a new secret is provided (not placeholder)
    if (data.platform === 'WOO' && consumerKey && consumerSecret && consumerSecret !== '****************') {
      const validation = await validateWooCommerceCredentials(
        data.domain ?? (existing as any).domain,
        consumerKey,
        consumerSecret
      );
      if (!validation.success) {
        throw new Error(validation.message || 'Failed to connect to WooCommerce');
      }
      encryptedSecret = encrypt(consumerSecret);
      connectionStatus = 'connected';
      connectionMessage = 'WooCommerce connection successful!';
    }

    const updateData: any = {
      ...rest,
      ...(consumerKey !== undefined && { consumerKey }),
      ...(encryptedSecret !== undefined && { consumerSecret: encryptedSecret }),
    };

    const store = await storeRepository.update(id, updateData);

    return { store, connectionStatus, message: connectionMessage };
  }

  /**
   * Purpose: Delete a store by ID.
   * Params:
   *   - id: string — Store identifier.
   * Returns:
   *   - Promise<void> — Resolves when deletion is complete.
   * Throws:
   *   - Error — When store not found.
   */
  async delete(id: string): Promise<void> {
    const existing = await storeRepository.findById(id);
    if (!existing) {
      throw new Error('Store not found');
    }
    await storeRepository.delete(id);
  }
}

export const storeService = new StoreService();

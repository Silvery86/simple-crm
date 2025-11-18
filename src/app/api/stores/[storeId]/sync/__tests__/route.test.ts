/**
 * Purpose: Test POST /api/stores/[storeId]/sync endpoint
 * Coverage: Normal sync, modifiedOnly sync, error cases (404, 400, 500)
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services/woocommerce-sync.service', () => ({
  wooCommerceSyncService: {
    syncStoreProducts: jest.fn(),
    syncModifiedProducts: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories/store.repo', () => ({
  storeRepository: {
    findById: jest.fn(),
  },
}));

import { wooCommerceSyncService } from '@/lib/services/woocommerce-sync.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';

describe('POST /api/stores/[storeId]/sync', () => {
  const mockStoreId = 'store-123';
  const mockSyncResult = {
    success: true,
    productsCreated: 5,
    productsUpdated: 10,
    productsFailed: 0,
    variantsCreated: 15,
    variantsUpdated: 20,
    variantsFailed: 0,
    errors: [],
  };

  const mockStore = {
    id: mockStoreId,
    name: 'Test Store',
    platform: 'WOO',
    domain: 'test.com',
    status: 'active',
    apiKey: 'key',
    apiSecret: 'secret',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal sync (without modifiedOnly)', () => {
    it('should sync store products with default options', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSyncResult);
      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalledWith(
        mockStoreId,
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });

    it('should sync with custom pageSize and maxPages', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({ pageSize: 50, maxPages: 5 }),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalledWith(
        mockStoreId,
        expect.objectContaining({
          pageSize: 50,
          maxPages: 5,
        })
      );
    });
  });

  describe('Modified-only sync', () => {
    it('should sync only modified products when modifiedOnly=true', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncModifiedProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/sync?modifiedOnly=true',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(wooCommerceSyncService.syncModifiedProducts).toHaveBeenCalledWith(mockStoreId);
      expect(wooCommerceSyncService.syncStoreProducts).not.toHaveBeenCalled();
    });

    it('should use normal sync when modifiedOnly=false', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/sync?modifiedOnly=false',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });

      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalled();
      expect(wooCommerceSyncService.syncModifiedProducts).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should return 404 when store not found', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 400 for invalid pageSize', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({ pageSize: -10 }),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('pageSize');
    });

    it('should return 400 for invalid maxPages', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({ maxPages: 0 }),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('maxPages');
    });

    it('should return 500 when sync service throws error', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockRejectedValue(
        new Error('WooCommerce API error')
      );

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON body', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty storeId', async () => {
      const request = new NextRequest('http://localhost:3000/api/stores//sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ storeId: '' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should handle sync result with errors', async () => {
      const resultWithErrors = {
        ...mockSyncResult,
        productsFailed: 2,
        errors: ['Product 1 failed', 'Product 2 failed'],
      };

      (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(resultWithErrors);

      const request = new NextRequest('http://localhost:3000/api/stores/store-123/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ storeId: mockStoreId });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.productsFailed).toBe(2);
      expect(data.data.errors).toHaveLength(2);
    });
  });
});

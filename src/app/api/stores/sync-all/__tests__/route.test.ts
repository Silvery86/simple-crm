/**
 * Purpose: Test POST /api/stores/sync-all endpoint
 * Coverage: Multiple stores sync, partial failures, result aggregation, empty stores
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
    list: jest.fn(),
  },
}));

import { wooCommerceSyncService } from '@/lib/services/woocommerce-sync.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';

describe('POST /api/stores/sync-all', () => {
  const mockStores = [
    {
      id: 'store-1',
      name: 'Store One',
      platform: 'WOO',
      domain: 'store1.com',
      status: 'active',
      apiKey: 'key1',
      apiSecret: 'secret1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'store-2',
      name: 'Store Two',
      platform: 'WOO',
      domain: 'store2.com',
      status: 'active',
      apiKey: 'key2',
      apiSecret: 'secret2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'store-3',
      name: 'Store Three',
      platform: 'WOO',
      domain: 'store3.com',
      status: 'active',
      apiKey: 'key3',
      apiSecret: 'secret3',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSyncResult = {
    total: 15,
    created: 5,
    updated: 10,
    skipped: 0,
    failed: 0,
    errors: [],
    duration: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful sync', () => {
    it('should sync all active WooCommerce stores', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: mockStores,
        meta: { page: 1, limit: 100, total: 3, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalStores).toBe(3);
      expect(data.data.summary.successfulStores).toBe(3);
      expect(data.data.summary.failedStores).toBe(0);
      expect(data.data.summary.totalProducts).toBe(15); // 5 created * 3 stores
      expect(data.data.stores).toHaveLength(3);
      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalledTimes(3);
    });

    it('should use modifiedOnly sync when query param is true', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [mockStores[0]],
        meta: { page: 1, limit: 100, total: 1, pages: 1 },
      });
      (wooCommerceSyncService.syncModifiedProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest(
        'http://localhost:3000/api/stores/sync-all?modifiedOnly=true',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(wooCommerceSyncService.syncModifiedProducts).toHaveBeenCalledWith('store-1');
      expect(wooCommerceSyncService.syncStoreProducts).not.toHaveBeenCalled();
    });

    it('should respect custom pageSize and maxPages', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [mockStores[0]],
        meta: { page: 1, limit: 100, total: 1, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({ pageSize: 50, maxPages: 10 }),
      });

      const response = await POST(request);

      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({
          pageSize: 50,
          maxPages: 10,
        })
      );
    });
  });

  describe('Partial failures', () => {
    it('should continue syncing other stores when one fails', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: mockStores,
        meta: { page: 1, limit: 100, total: 3, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock)
        .mockResolvedValueOnce(mockSyncResult) // Store 1 succeeds
        .mockRejectedValueOnce(new Error('API connection failed')) // Store 2 fails
        .mockResolvedValueOnce(mockSyncResult); // Store 3 succeeds

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalStores).toBe(3);
      expect(data.data.summary.successfulStores).toBe(2);
      expect(data.data.summary.failedStores).toBe(1);
      expect(data.data.stores[0].success).toBe(true);
      expect(data.data.stores[1].success).toBe(false);
      expect(data.data.stores[1].error).toContain('API connection failed');
      expect(data.data.stores[2].success).toBe(true);
      expect(wooCommerceSyncService.syncStoreProducts).toHaveBeenCalledTimes(3);
    });

    it('should aggregate total products correctly with partial failures', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [mockStores[0], mockStores[1]],
        meta: { page: 1, limit: 100, total: 2, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock)
        .mockResolvedValueOnce({ ...mockSyncResult, created: 10 })
        .mockRejectedValueOnce(new Error('Sync failed'));

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.summary.totalProducts).toBe(10); // Only successful store counted
      expect(data.data.summary.successfulStores).toBe(1);
      expect(data.data.summary.failedStores).toBe(1);
    });

    it('should handle all stores failing', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [mockStores[0], mockStores[1]],
        meta: { page: 1, limit: 100, total: 2, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.summary.successfulStores).toBe(0);
      expect(data.data.summary.failedStores).toBe(2);
      expect(data.data.summary.totalProducts).toBe(0);
      expect(data.data.stores.every((s: any) => !s.success)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle no active WooCommerce stores', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 100, total: 0, pages: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalStores).toBe(0);
      expect(data.data.summary.successfulStores).toBe(0);
      expect(data.data.summary.failedStores).toBe(0);
      expect(data.data.stores).toHaveLength(0);
      expect(wooCommerceSyncService.syncStoreProducts).not.toHaveBeenCalled();
    });

    it('should filter by platform=WOO and status=active', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: mockStores,
        meta: { page: 1, limit: 100, total: 3, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(storeRepository.list).toHaveBeenCalledWith({
        platform: 'WOO',
        status: 'active',
      });
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid pageSize', async () => {
      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({ pageSize: -5 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('pageSize');
    });

    it('should return 400 for invalid maxPages', async () => {
      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({ maxPages: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('maxPages');
    });

    it('should return 500 when store listing fails', async () => {
      (storeRepository.list as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Result aggregation', () => {
    it('should correctly aggregate products from multiple stores', async () => {
      const results = [
        { ...mockSyncResult, created: 10, updated: 5 },
        { ...mockSyncResult, created: 15, updated: 8 },
        { ...mockSyncResult, created: 20, updated: 12 },
      ];

      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: mockStores,
        meta: { page: 1, limit: 100, total: 3, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock)
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(results[2]);

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.summary.totalProducts).toBe(45); // 10 + 15 + 20
      expect(data.data.stores[0].result.created).toBe(10);
      expect(data.data.stores[1].result.created).toBe(15);
      expect(data.data.stores[2].result.created).toBe(20);
    });

    it('should include store names in results', async () => {
      (storeRepository.list as jest.Mock).mockResolvedValue({
        data: [mockStores[0]],
        meta: { page: 1, limit: 100, total: 1, pages: 1 },
      });
      (wooCommerceSyncService.syncStoreProducts as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/stores/sync-all', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.stores[0].storeId).toBe('store-1');
      expect(data.data.stores[0].storeName).toBe('Store One');
    });
  });
});

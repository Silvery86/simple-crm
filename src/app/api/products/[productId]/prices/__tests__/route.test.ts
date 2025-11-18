/**
 * Purpose: Test GET /api/products/[productId]/prices endpoint
 * Coverage: Price comparison across stores, error handling, empty stores
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services/product-display.service', () => ({
  productDisplayService: {
    compareProductPrices: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories/product.repo', () => ({
  productRepository: {
    findById: jest.fn(),
  },
}));

import { productDisplayService } from '@/lib/services/product-display.service';
import { productRepository } from '@/lib/db/repositories/product.repo';

describe('GET /api/products/[productId]/prices', () => {
  const mockProductId = 'product-123';

  const mockProduct = {
    id: mockProductId,
    title: 'Test Product',
    sku: 'TEST-SKU',
    masterPrice: 100,
    masterCompareAtPrice: null,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPriceComparison = {
    productId: mockProductId,
    title: 'Test Product',
    masterPrice: {
      price: 100,
      compareAtPrice: null,
      currency: 'USD',
    },
    stores: [
      {
        storeId: 'store-1',
        storeName: 'Store One',
        displayPrice: {
          price: 110,
          compareAtPrice: null,
          currency: 'USD',
          priceSource: 'adjustment' as const,
          adjustmentApplied: {
            type: 'markup' as const,
            value: 10,
            unit: 'percent' as const,
          },
        },
      },
      {
        storeId: 'store-2',
        storeName: 'Store Two',
        displayPrice: {
          price: 95,
          compareAtPrice: null,
          currency: 'USD',
          priceSource: 'custom' as const,
          adjustmentApplied: null,
        },
      },
      {
        storeId: 'store-3',
        storeName: 'Store Three',
        displayPrice: {
          price: 100,
          compareAtPrice: null,
          currency: 'USD',
          priceSource: 'master' as const,
          adjustmentApplied: null,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (productRepository.findById as jest.Mock).mockResolvedValue(mockProduct);
    (productDisplayService.compareProductPrices as jest.Mock).mockResolvedValue(
      mockPriceComparison
    );
  });

  describe('Successful price comparison', () => {
    it('should return price comparison for product across all stores', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.productId).toBe(mockProductId);
      expect(data.data.title).toBe('Test Product');
      expect(data.data.masterPrice.price).toBe(100);
      expect(data.data.stores).toHaveLength(3);
      expect(productDisplayService.compareProductPrices).toHaveBeenCalledWith(mockProductId);
    });

    it('should include all price sources (master, custom, adjustment)', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const priceSources = data.data.stores.map((s: any) => s.displayPrice.priceSource);
      expect(priceSources).toContain('master');
      expect(priceSources).toContain('custom');
      expect(priceSources).toContain('adjustment');
    });

    it('should show adjustment details for adjusted prices', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const adjustedStore = data.data.stores.find(
        (s: any) => s.displayPrice.priceSource === 'adjustment'
      );
      expect(adjustedStore.displayPrice.adjustmentApplied).toEqual({
        type: 'markup',
        value: 10,
        unit: 'percent',
      });
      expect(adjustedStore.displayPrice.price).toBe(110);
    });

    it('should show null adjustment for non-adjusted prices', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const customStore = data.data.stores.find(
        (s: any) => s.displayPrice.priceSource === 'custom'
      );
      expect(customStore.displayPrice.adjustmentApplied).toBeNull();

      const masterStore = data.data.stores.find(
        (s: any) => s.displayPrice.priceSource === 'master'
      );
      expect(masterStore.displayPrice.adjustmentApplied).toBeNull();
    });

    it('should include store names with prices', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(data.data.stores[0].storeName).toBe('Store One');
      expect(data.data.stores[1].storeName).toBe('Store Two');
      expect(data.data.stores[2].storeName).toBe('Store Three');
    });
  });

  describe('Edge cases', () => {
    it('should handle product with no store mappings', async () => {
      const emptyComparison = {
        ...mockPriceComparison,
        stores: [],
      };

      (productDisplayService.compareProductPrices as jest.Mock).mockResolvedValue(
        emptyComparison
      );

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stores).toHaveLength(0);
      expect(data.data.masterPrice).toBeDefined();
    });

    it('should handle product with only one store', async () => {
      const singleStoreComparison = {
        ...mockPriceComparison,
        stores: [mockPriceComparison.stores[0]],
      };

      (productDisplayService.compareProductPrices as jest.Mock).mockResolvedValue(
        singleStoreComparison
      );

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stores).toHaveLength(1);
    });

    it('should handle product with compareAtPrice', async () => {
      const comparisonWithCompareAt = {
        ...mockPriceComparison,
        masterPrice: {
          price: 100,
          compareAtPrice: 120,
          currency: 'USD',
        },
        stores: [
          {
            ...mockPriceComparison.stores[0],
            displayPrice: {
              ...mockPriceComparison.stores[0].displayPrice,
              compareAtPrice: 130,
            },
          },
        ],
      };

      (productDisplayService.compareProductPrices as jest.Mock).mockResolvedValue(
        comparisonWithCompareAt
      );

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(data.data.masterPrice.compareAtPrice).toBe(120);
      expect(data.data.stores[0].displayPrice.compareAtPrice).toBe(130);
    });

    it('should handle different currencies', async () => {
      const multiCurrencyComparison = {
        ...mockPriceComparison,
        masterPrice: {
          price: 100,
          compareAtPrice: null,
          currency: 'USD',
        },
        stores: [
          {
            ...mockPriceComparison.stores[0],
            displayPrice: {
              ...mockPriceComparison.stores[0].displayPrice,
              price: 85,
              currency: 'EUR',
            },
          },
        ],
      };

      (productDisplayService.compareProductPrices as jest.Mock).mockResolvedValue(
        multiCurrencyComparison
      );

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(data.data.masterPrice.currency).toBe('USD');
      expect(data.data.stores[0].displayPrice.currency).toBe('EUR');
    });

    it('should handle empty productId', async () => {
      const request = new NextRequest('http://localhost:3000/api/products//prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: '' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return 404 when product not found', async () => {
      (productRepository.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 500 when service throws error', async () => {
      (productDisplayService.compareProductPrices as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle repository findById error', async () => {
      (productRepository.findById as jest.Mock).mockRejectedValue(new Error('Connection error'));

      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle invalid productId format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/products/invalid-id-$%^/prices',
        {
          method: 'GET',
        }
      );

      const params = Promise.resolve({ productId: 'invalid-id-$%^' });
      const response = await GET(request, { params });

      // Should still call the service but return 404 if not found
      expect(productRepository.findById).toHaveBeenCalledWith('invalid-id-$%^');
    });
  });

  describe('Price comparison details', () => {
    it('should show price differences between stores', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const prices = data.data.stores.map((s: any) => s.displayPrice.price);
      expect(prices).toContain(110); // markup
      expect(prices).toContain(95); // custom
      expect(prices).toContain(100); // master
    });

    it('should identify highest and lowest prices', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const prices = data.data.stores.map((s: any) => s.displayPrice.price);
      const highest = Math.max(...prices);
      const lowest = Math.min(...prices);

      expect(highest).toBe(110);
      expect(lowest).toBe(95);
    });

    it('should preserve storeId for each price entry', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(data.data.stores[0].storeId).toBe('store-1');
      expect(data.data.stores[1].storeId).toBe('store-2');
      expect(data.data.stores[2].storeId).toBe('store-3');
    });
  });

  describe('Response structure', () => {
    it('should have correct response structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('productId');
      expect(data.data).toHaveProperty('title');
      expect(data.data).toHaveProperty('masterPrice');
      expect(data.data).toHaveProperty('stores');
      expect(Array.isArray(data.data.stores)).toBe(true);
    });

    it('should have correct store entry structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/products/product-123/prices', {
        method: 'GET',
      });

      const params = Promise.resolve({ productId: mockProductId });
      const response = await GET(request, { params });
      const data = await response.json();

      const storeEntry = data.data.stores[0];
      expect(storeEntry).toHaveProperty('storeId');
      expect(storeEntry).toHaveProperty('storeName');
      expect(storeEntry).toHaveProperty('displayPrice');
      expect(storeEntry.displayPrice).toHaveProperty('price');
      expect(storeEntry.displayPrice).toHaveProperty('compareAtPrice');
      expect(storeEntry.displayPrice).toHaveProperty('currency');
      expect(storeEntry.displayPrice).toHaveProperty('priceSource');
      expect(storeEntry.displayPrice).toHaveProperty('adjustmentApplied');
    });
  });
});

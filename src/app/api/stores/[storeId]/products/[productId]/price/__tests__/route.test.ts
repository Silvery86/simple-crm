/**
 * Purpose: Test PUT /api/stores/[storeId]/products/[productId]/price endpoint
 * Coverage: Custom price, adjustment rules, clear overrides, validation errors
 */

import { PUT } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services/product-display.service', () => ({
  productDisplayService: {
    setStorePrice: jest.fn(),
    setStorePriceAdjustment: jest.fn(),
    getProductWithPrice: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories/store.repo', () => ({
  storeRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories/product.repo', () => ({
  productRepository: {
    findById: jest.fn(),
  },
}));

import { productDisplayService } from '@/lib/services/product-display.service';
import { storeRepository } from '@/lib/db/repositories/store.repo';
import { productRepository } from '@/lib/db/repositories/product.repo';

describe('PUT /api/stores/[storeId]/products/[productId]/price', () => {
  const mockStoreId = 'store-123';
  const mockProductId = 'product-456';

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

  const mockProductWithPrice = {
    ...mockProduct,
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
    priceSource: 'adjustment' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (storeRepository.findById as jest.Mock).mockResolvedValue(mockStore);
    (productRepository.findById as jest.Mock).mockResolvedValue(mockProduct);
    (productDisplayService.getProductWithPrice as jest.Mock).mockResolvedValue(mockProductWithPrice);
  });

  describe('Custom price mode', () => {
    it('should set custom price without compareAtPrice', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(productDisplayService.setStorePrice).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        120,
        null,
        undefined
      );
      expect(data.data.displayPrice).toBeDefined();
      expect(data.data.priceSource).toBeDefined();
    });

    it('should set custom price with compareAtPrice', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
            compareAtPrice: 150,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(productDisplayService.setStorePrice).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        120,
        150,
        undefined
      );
    });

    it('should set custom price with currency', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
            currency: 'EUR',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(productDisplayService.setStorePrice).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        120,
        null,
        'EUR'
      );
    });

    it('should return 400 when price is missing in custom mode', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('price');
    });

    it('should return 400 when price is negative', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: -10,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('price');
    });
  });

  describe('Adjustment mode', () => {
    it('should set markup percentage adjustment', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'markup',
            value: 15,
            unit: 'percent',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(productDisplayService.setStorePriceAdjustment).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        {
          type: 'markup',
          value: 15,
          unit: 'percent',
        }
      );
    });

    it('should set discount amount adjustment', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'discount',
            value: 10,
            unit: 'amount',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(productDisplayService.setStorePriceAdjustment).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        {
          type: 'discount',
          value: 10,
          unit: 'amount',
        }
      );
    });

    it('should set fixed price adjustment', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'fixed',
            value: 99.99,
            unit: 'amount',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(productDisplayService.setStorePriceAdjustment).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        {
          type: 'fixed',
          value: 99.99,
          unit: 'amount',
        }
      );
    });

    it('should return 400 when adjustmentType is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            value: 10,
            unit: 'percent',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('adjustmentType');
    });

    it('should return 400 when value is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'markup',
            unit: 'percent',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('value');
    });

    it('should return 400 when unit is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'markup',
            value: 10,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('unit');
    });

    it('should return 400 for invalid adjustmentType', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'invalid',
            value: 10,
            unit: 'percent',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid unit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'markup',
            value: 10,
            unit: 'invalid',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Clear mode', () => {
    it('should clear all price overrides', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'clear',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(productDisplayService.setStorePrice).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        null,
        null,
        undefined
      );
      expect(productDisplayService.setStorePriceAdjustment).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        null
      );
    });

    it('should return master price after clearing', async () => {
      const masterPriceProduct = {
        ...mockProduct,
        displayPrice: {
          price: 100,
          compareAtPrice: null,
          currency: 'USD',
          priceSource: 'master' as const,
          adjustmentApplied: null,
        },
        priceSource: 'master' as const,
      };

      (productDisplayService.getProductWithPrice as jest.Mock).mockResolvedValue(
        masterPriceProduct
      );

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'clear',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(data.data.displayPrice.priceSource).toBe('master');
      expect(data.data.displayPrice.price).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('should return 404 when store not found', async () => {
      (storeRepository.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Store not found');
    });

    it('should return 404 when product not found', async () => {
      (productRepository.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Product not found');
    });

    it('should return 400 for invalid type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'invalid',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('should return 400 for missing type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({}),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 when service throws error', async () => {
      (productDisplayService.setStorePrice as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 120,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle malformed JSON body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero price', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 0,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(response.status).toBe(200);
      expect(productDisplayService.setStorePrice).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        0,
        null,
        undefined
      );
    });

    it('should handle very large price values', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'custom',
            price: 999999.99,
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(response.status).toBe(200);
    });

    it('should handle 100% discount', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/stores/store-123/products/product-456/price',
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'adjustment',
            adjustmentType: 'discount',
            value: 100,
            unit: 'percent',
          }),
        }
      );

      const params = Promise.resolve({ storeId: mockStoreId, productId: mockProductId });
      const response = await PUT(request, { params });

      expect(response.status).toBe(200);
      expect(productDisplayService.setStorePriceAdjustment).toHaveBeenCalledWith(
        mockProductId,
        mockStoreId,
        {
          type: 'discount',
          value: 100,
          unit: 'percent',
        }
      );
    });
  });
});

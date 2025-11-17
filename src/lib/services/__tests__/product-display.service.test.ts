/**
 * Unit Tests - Product Display Service
 * 
 * Purpose: Test price resolution logic and store-specific overrides
 * Coverage: Master price, Override price, Adjusted price, Price comparison
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProductDisplayService } from '../product-display.service';
import { Decimal } from '@prisma/client/runtime/library';
import type { Product, StoreProductMap } from '@prisma/client';

// Mock repositories
jest.mock('@/lib/db/repositories/product.repo', () => ({
  productRepository: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/db/repositories/store-product-map.repo', () => ({
  storeProductMapRepository: {
    findByStoreAndProduct: jest.fn(),
    findByStore: jest.fn(),
    findByProduct: jest.fn(),
    update: jest.fn(),
  },
}));

describe('ProductDisplayService', () => {
  let service: ProductDisplayService;
  let mockProductRepo: any;
  let mockStoreProductMapRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { productRepository } = require('@/lib/db/repositories/product.repo');
    const { storeProductMapRepository } = require('@/lib/db/repositories/store-product-map.repo');
    
    mockProductRepo = productRepository;
    mockStoreProductMapRepo = storeProductMapRepository;
    
    service = new ProductDisplayService();
  });

  describe('getProductWithPrice - Master Price', () => {
    it('should return master price when no store context provided', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        description: 'Description',
        handle: 'test-product',
        variants: [
          {
            id: 'var-1',
            price: new Decimal('100.00'),
            compareAtPrice: new Decimal('120.00'),
            currency: 'USD'
          }
        ]
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await service.getProductWithPrice('prod-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.displayPrice).toBe(100);
      expect(result?.priceSource).toBe('MASTER');
    });

    it('should return null when product not found', async () => {
      // Arrange
      mockProductRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.getProductWithPrice('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return 0 when product has no variants', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-2',
        title: 'Product Without Variants',
        variants: []
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await service.getProductWithPrice('prod-2');

      // Assert
      expect(result?.displayPrice).toBe(0);
      expect(result?.priceSource).toBe('MASTER');
    });
  });

  describe('getProductWithPrice - Store Override', () => {
    it('should return custom price when store override exists', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        variants: [
          {
            id: 'var-1',
            price: new Decimal('100.00'),
            compareAtPrice: null,
            currency: 'USD'
          }
        ]
      };

      const mockMapping: Partial<StoreProductMap> = {
        id: 'map-1',
        storeId: 'store-1',
        productId: 'prod-1',
        externalId: 'woo-123',
        customTitle: 'Custom Title',
        customDescription: null,
        customPrice: new Decimal('150.00'), // Override price
        customCompareAtPrice: null,
        customCurrency: 'USD',
        priceAdjustment: null,
        isActive: true,
        displayOrder: null,
        lastSyncedAt: null,
        syncSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);

      // Act
      const result = await service.getProductWithPrice('prod-1', { storeId: 'store-1' });

      // Assert
      expect(result?.displayPrice).toBe(150);
      expect(result?.priceSource).toBe('STORE_OVERRIDE');
      expect(result?.title).toBe('Custom Title'); // Should use custom title
    });

    it('should prioritize custom price over price adjustment', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        variants: [{ price: new Decimal('100.00') }]
      };

      const mockMapping: Partial<StoreProductMap> = {
        id: 'map-1',
        storeId: 'store-1',
        productId: 'prod-1',
        externalId: 'woo-123',
        customTitle: null,
        customDescription: null,
        customPrice: new Decimal('150.00'), // Custom price
        customCompareAtPrice: null,
        customCurrency: null,
        priceAdjustment: { type: 'markup', value: 20, unit: 'percent' }, // Also has adjustment
        isActive: true,
        displayOrder: null,
        lastSyncedAt: null,
        syncSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);

      // Act
      const result = await service.getProductWithPrice('prod-1', { storeId: 'store-1' });

      // Assert
      expect(result?.displayPrice).toBe(150); // Should use custom price, not adjustment
      expect(result?.priceSource).toBe('STORE_OVERRIDE');
    });
  });

  describe('getProductWithPrice - Price Adjustment', () => {
    it('should apply percentage markup adjustment', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        variants: [{ price: new Decimal('100.00') }]
      };

      const mockMapping: Partial<StoreProductMap> = {
        id: 'map-1',
        storeId: 'store-1',
        productId: 'prod-1',
        externalId: 'woo-123',
        customTitle: null,
        customDescription: null,
        customPrice: null, // No custom price
        customCompareAtPrice: null,
        customCurrency: null,
        priceAdjustment: { type: 'markup', value: 20, unit: 'percent' }, // 20% markup
        isActive: true,
        displayOrder: null,
        lastSyncedAt: null,
        syncSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);

      // Act
      const result = await service.getProductWithPrice('prod-1', { storeId: 'store-1' });

      // Assert
      expect(result?.displayPrice).toBe(120); // 100 + 20% = 120
      expect(result?.priceSource).toBe('AUTO_ADJUSTED');
    });

    it('should apply fixed amount adjustment', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        variants: [{ price: new Decimal('100.00') }]
      };

      const mockMapping: Partial<StoreProductMap> = {
        id: 'map-1',
        storeId: 'store-1',
        productId: 'prod-1',
        externalId: 'woo-123',
        customTitle: null,
        customDescription: null,
        customPrice: null,
        customCompareAtPrice: null,
        customCurrency: null,
        priceAdjustment: { type: 'markup', value: 15, unit: 'fixed' }, // +$15
        isActive: true,
        displayOrder: null,
        lastSyncedAt: null,
        syncSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);

      // Act
      const result = await service.getProductWithPrice('prod-1', { storeId: 'store-1' });

      // Assert
      expect(result?.displayPrice).toBe(115); // 100 + 15 = 115
      expect(result?.priceSource).toBe('AUTO_ADJUSTED');
    });
  });

  describe('getStoreProducts - Pagination', () => {
    it('should return paginated products with prices', async () => {
      // Arrange
      const mockMappings = [
        {
          id: 'map-1',
          storeId: 'store-1',
          productId: 'prod-1',
          customPrice: new Decimal('100.00'),
          product: {
            id: 'prod-1',
            title: 'Product 1',
            variants: [{ price: new Decimal('90.00') }]
          }
        },
        {
          id: 'map-2',
          storeId: 'store-1',
          productId: 'prod-2',
          customPrice: null,
          product: {
            id: 'prod-2',
            title: 'Product 2',
            variants: [{ price: new Decimal('50.00') }]
          }
        }
      ];

      mockStoreProductMapRepo.findByStore.mockResolvedValue({
        mappings: mockMappings,
        total: 2
      });

      // Act
      const result = await service.getStoreProducts('store-1', {
        page: 1,
        pageSize: 10
      });

      // Assert
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.products[0].displayPrice).toBe(100); // Custom price
      expect(result.products[1].displayPrice).toBe(50); // Master price
    });

    it('should filter active products only', async () => {
      // Arrange
      mockStoreProductMapRepo.findByStore.mockResolvedValue({
        mappings: [],
        total: 0
      });

      // Act
      await service.getStoreProducts('store-1', {
        isActive: true
      });

      // Assert
      expect(mockStoreProductMapRepo.findByStore).toHaveBeenCalledWith(
        'store-1',
        expect.objectContaining({
          isActive: true
        })
      );
    });
  });

  describe('compareProductPrices', () => {
    it('should compare prices across multiple stores', async () => {
      // Arrange
      const mockProduct: any = {
        id: 'prod-1',
        title: 'Test Product',
        variants: [{ price: new Decimal('100.00') }]
      };

      const mockMappings = [
        {
          storeId: 'store-1',
          customPrice: new Decimal('120.00'),
          store: { id: 'store-1', name: 'Store 1' }
        },
        {
          storeId: 'store-2',
          customPrice: null,
          priceAdjustment: { type: 'markup', value: 10, unit: 'percent' },
          store: { id: 'store-2', name: 'Store 2' }
        }
      ];

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreProductMapRepo.findByProduct.mockResolvedValue(mockMappings);

      // Act
      const result = await service.compareProductPrices('prod-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.masterPrice).toBe(100);
      expect(result?.stores).toHaveLength(2);
      expect(result?.stores[0].price).toBe(120); // Store 1 override
      expect(result?.stores[1].price).toBeCloseTo(110, 2); // Store 2 adjustment (100 + 10%) - use toBeCloseTo for floating point
    });
  });

  describe('setStorePrice', () => {
    it('should update custom price with Decimal conversion', async () => {
      // Arrange
      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      await service.setStorePrice('prod-1', 'store-1', 199.99, null, 'USD');

      // Assert
      expect(mockStoreProductMapRepo.update).toHaveBeenCalledWith(
        'store-1',
        'prod-1',
        expect.objectContaining({
          customPrice: expect.any(Decimal),
          customCurrency: 'USD'
        })
      );
    });

    it('should clear adjustment when setting custom price', async () => {
      // Arrange
      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      await service.setStorePrice('prod-1', 'store-1', 150, null, 'USD');

      // Assert
      expect(mockStoreProductMapRepo.update).toHaveBeenCalledWith(
        'store-1',
        'prod-1',
        expect.objectContaining({
          priceAdjustment: null
        })
      );
    });

    it('should handle null price (clear custom price)', async () => {
      // Arrange
      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      await service.setStorePrice('prod-1', 'store-1', null, null, 'USD');

      // Assert
      expect(mockStoreProductMapRepo.update).toHaveBeenCalledWith(
        'store-1',
        'prod-1',
        expect.objectContaining({
          customPrice: null
        })
      );
    });
  });

  describe('setStorePriceAdjustment', () => {
    it('should set price adjustment rule', async () => {
      // Arrange
      const adjustmentRule = {
        type: 'markup',
        value: 25,
        unit: 'percent'
      };

      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      await service.setStorePriceAdjustment('prod-1', 'store-1', adjustmentRule);

      // Assert
      expect(mockStoreProductMapRepo.update).toHaveBeenCalledWith(
        'store-1',
        'prod-1',
        expect.objectContaining({
          priceAdjustment: adjustmentRule,
          customPrice: null // Should clear custom price
        })
      );
    });
  });
});

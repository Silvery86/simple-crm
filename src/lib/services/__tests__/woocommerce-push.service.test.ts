/**
 * Unit Tests - WooCommerce Push Service
 * 
 * Purpose: Test pushing products from CRM to WooCommerce stores
 * Coverage: Push operations, duplicate checks, updates, deletes, error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WooCommercePushService } from '../woocommerce-push.service';
import type { Store, Product, ProductVariant } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@woocommerce/woocommerce-rest-api');
jest.mock('@/lib/db/repositories/product.repo');
jest.mock('@/lib/db/repositories/store.repo');
jest.mock('@/lib/db/repositories/store-product-map.repo');
jest.mock('@/lib/db/repositories/product-variant.repo');

describe('WooCommercePushService', () => {
  let service: WooCommercePushService;
  let mockStoreRepo: any;
  let mockProductRepo: any;
  let mockStoreProductMapRepo: any;
  let mockProductVariantRepo: any;
  let mockWooCommerceApi: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked dependencies
    const { storeRepository } = require('@/lib/db/repositories/store.repo');
    const { productRepository } = require('@/lib/db/repositories/product.repo');
    const { storeProductMapRepository } = require('@/lib/db/repositories/store-product-map.repo');
    const { productVariantRepository } = require('@/lib/db/repositories/product-variant.repo');

    mockStoreRepo = storeRepository;
    mockProductRepo = productRepository;
    mockStoreProductMapRepo = storeProductMapRepository;
    mockProductVariantRepo = productVariantRepository;

    // Mock WooCommerce API
    const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
    mockWooCommerceApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    WooCommerceRestApi.mockImplementation(() => mockWooCommerceApi);

    service = new WooCommercePushService();
  });

  describe('pushProductToStore - Success Flow', () => {
    it('should push new product successfully', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
        handle: 'test-product',
        description: 'Product description',
        status: 'ACTIVE',
        vendor: 'Test Vendor',
        productType: 'Physical',
        tags: ['tag1', 'tag2'],
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'TEST-SKU',
        price: new Decimal('99.99'),
        compareAtPrice: new Decimal('149.99'),
        inventoryQuantity: 10,
        featuredImage: 'https://example.com/image.jpg',
        currency: 'USD',
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        name: 'Test Store',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null); // No existing mapping
      
      mockWooCommerceApi.get.mockResolvedValue({ data: [] }); // No duplicate SKU
      mockWooCommerceApi.post.mockResolvedValue({
        data: {
          id: 123,
          name: 'Test Product',
          permalink: 'https://test.com/product/test-product'
        }
      });
      mockStoreProductMapRepo.create.mockResolvedValue({});

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.externalId).toBe('123');
      expect(result.url).toBe('https://test.com/product/test-product');
      expect(mockWooCommerceApi.post).toHaveBeenCalledWith(
        'products',
        expect.objectContaining({
          name: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-SKU'
          // Note: regular_price is '149.99' (compareAtPrice) and sale_price is '99.99' (price)
        })
      );
      expect(mockStoreProductMapRepo.create).toHaveBeenCalled();
    });

    it('should update existing product with forceUpdate', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Updated Product',
        handle: 'test-product',
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'TEST-SKU',
        price: new Decimal('89.99'),
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      const mockExistingMapping = {
        id: 'map-1',
        storeId: 'store-1',
        productId: 'prod-1',
        externalId: '123',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockExistingMapping);
      
      mockWooCommerceApi.put.mockResolvedValue({
        data: {
          id: 123,
          name: 'Updated Product',
          permalink: 'https://test.com/product/test-product'
        }
      });
      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1', {
        forceUpdate: true
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockWooCommerceApi.put).toHaveBeenCalledWith(
        'products/123',
        expect.objectContaining({
          name: 'Updated Product'
        })
      );
    });

    it('should skip when mapping exists without forceUpdate', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      const mockExistingMapping = {
        id: 'map-1',
        externalId: '123',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockExistingMapping);

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.error).toContain('Product already exists');
      expect(mockWooCommerceApi.post).not.toHaveBeenCalled();
    });

    it('should skip when SKU exists in WooCommerce', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);
      
      // SKU already exists in WooCommerce
      mockWooCommerceApi.get.mockResolvedValue({
        data: [{ id: 456, sku: 'TEST-SKU' }]
      });

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.error).toContain('Product with SKU TEST-SKU already exists');
      expect(mockWooCommerceApi.post).not.toHaveBeenCalled();
    });
  });

  describe('pushProductToStore - Error Handling', () => {
    it('should return error when product not found', async () => {
      // Arrange
      mockProductRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.pushProductToStore('non-existent', 'store-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product not found');
    });

    it('should return error when store not found', async () => {
      // Arrange
      const mockProduct: Partial<Product> = { id: 'prod-1' };
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.pushProductToStore('prod-1', 'non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Store not found');
    });

    it('should return error when store is inactive', async () => {
      // Arrange
      const mockProduct: Partial<Product> = { id: 'prod-1' };
      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: false, // Inactive
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Store is not active');
    });

    it('should return error when platform is not WOO', async () => {
      // Arrange
      const mockProduct: Partial<Product> = { id: 'prod-1' };
      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'SHOPIFY', // Wrong platform
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Store platform must be WOO');
    });

    it('should handle WooCommerce API errors', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);
      mockWooCommerceApi.get.mockResolvedValue({ data: [] });
      
      // WooCommerce API error
      mockWooCommerceApi.post.mockRejectedValue(new Error('API Error'));

      // Act
      const result = await service.pushProductToStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });
  });

  describe('pushProductToAllStores', () => {
    it('should push to all active WooCommerce stores', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
      };

      const mockStores: Partial<Store>[] = [
        {
          id: 'store-1',
          name: 'Store 1',
          isActive: true,
          platform: 'WOO',
          domain: 'https://store1.com',
          consumerKey: 'ck1',
          consumerSecret: 'cs1',
        },
        {
          id: 'store-2',
          name: 'Store 2',
          isActive: true,
          platform: 'WOO',
          domain: 'https://store2.com',
          consumerKey: 'ck2',
          consumerSecret: 'cs2',
        },
        {
          id: 'store-3',
          name: 'Store 3',
          isActive: false, // Should skip
          platform: 'WOO',
        },
      ];

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
        price: new Decimal('99.99'),
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.list.mockResolvedValue({
        data: mockStores,
        total: 3
      });
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);
      mockWooCommerceApi.get.mockResolvedValue({ data: [] });
      mockWooCommerceApi.post.mockResolvedValue({
        data: { id: 123, permalink: 'https://example.com' }
      });
      mockStoreProductMapRepo.create.mockResolvedValue({});

      // Act
      const results = await service.pushProductToAllStores('prod-1');

      // Assert
      expect(results.size).toBe(2); // Only 2 active stores
      expect(results.has('store-1')).toBe(true);
      expect(results.has('store-2')).toBe(true);
      expect(results.has('store-3')).toBe(false); // Skipped inactive
    });

    it('should handle mixed success and failure', async () => {
      // Arrange
      const mockProduct: Partial<Product> = { id: 'prod-1' };
      const mockStores: Partial<Store>[] = [
        {
          id: 'store-1',
          isActive: true,
          platform: 'WOO',
          domain: 'https://store1.com',
          consumerKey: 'ck1',
          consumerSecret: 'cs1',
        },
        {
          id: 'store-2',
          isActive: true,
          platform: 'WOO',
          domain: 'https://store2.com',
          consumerKey: 'ck2',
          consumerSecret: 'cs2',
        },
      ];

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.list.mockResolvedValue({ data: mockStores, total: 2 });
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);
      mockWooCommerceApi.get.mockResolvedValue({ data: [] });
      
      // First store succeeds, second fails
      mockWooCommerceApi.post
        .mockResolvedValueOnce({ data: { id: 123 } })
        .mockRejectedValueOnce(new Error('API Error'));
      mockStoreProductMapRepo.create.mockResolvedValue({});

      // Act
      const results = await service.pushProductToAllStores('prod-1');

      // Assert
      expect(results.size).toBe(2);
      // Both should have been attempted (even if one failed)
      expect(results.has('store-1')).toBe(true);
      expect(results.has('store-2')).toBe(true);
    });
  });

  describe('updateProductOnStore', () => {
    it('should update product on specific store', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Updated Product',
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
        price: new Decimal('79.99'),
      };

      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      const mockMapping = {
        id: 'map-1',
        externalId: '123',
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);
      
      mockWooCommerceApi.put.mockResolvedValue({
        data: { id: 123, name: 'Updated Product' }
      });
      mockStoreProductMapRepo.update.mockResolvedValue({});

      // Act
      const result = await service.updateProductOnStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(true);
      expect(mockWooCommerceApi.put).toHaveBeenCalledWith(
        'products/123',
        expect.objectContaining({
          name: 'Updated Product',
          regular_price: '79.99'
        })
      );
    });

    it('should return error when mapping not found', async () => {
      // Arrange
      const mockProduct: Partial<Product> = { id: 'prod-1', title: 'Test' };
      const mockStore: Partial<Store> = { 
        id: 'store-1', 
        isActive: true, 
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test'
      };

      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU',
        price: new Decimal('99.99')
      };

      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockProductVariantRepo.findByProductId.mockResolvedValue([mockVariant]);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);
      
      // Mock WooCommerce API
      mockWooCommerceApi.get.mockResolvedValue({ data: [] }); // No duplicate SKU
      mockWooCommerceApi.post.mockResolvedValue({
        data: { id: 999, permalink: 'https://test.com/product' }
      });
      mockStoreProductMapRepo.create.mockResolvedValue({});

      // Act
      const result = await service.updateProductOnStore('prod-1', 'store-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('created'); // Will create since no mapping exists
    });
  });

  describe('deleteProductFromStore', () => {
    it('should delete product from store', async () => {
      // Arrange
      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
        domain: 'https://test.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      };

      const mockMapping = {
        id: 'map-1',
        externalId: '123',
      };

      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(mockMapping);
      mockWooCommerceApi.delete.mockResolvedValue({ data: { id: 123 } });
      mockStoreProductMapRepo.delete.mockResolvedValue(true);

      // Act
      const result = await service.deleteProductFromStore('prod-1', 'store-1');

      // Assert
      expect(result).toBe(true);
      expect(mockWooCommerceApi.delete).toHaveBeenCalledWith(
        'products/123',
        { force: true }
      );
      expect(mockStoreProductMapRepo.delete).toHaveBeenCalledWith('store-1', 'prod-1');
    });

    it('should return false when mapping not found', async () => {
      // Arrange
      const mockStore: Partial<Store> = {
        id: 'store-1',
        isActive: true,
        platform: 'WOO',
      };

      mockStoreRepo.findById.mockResolvedValue(mockStore);
      mockStoreProductMapRepo.findByStoreAndProduct.mockResolvedValue(null);

      // Act
      const result = await service.deleteProductFromStore('prod-1', 'store-1');

      // Assert
      expect(result).toBe(false);
    });
  });
});

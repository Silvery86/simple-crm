/**
 * Unit Tests - Duplicate Detection Service
 * 
 * Purpose: Test 3-level duplicate detection (SKU → Handle → Title)
 * Coverage: SKU match, Handle match, Title fuzzy match, No match scenarios
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DuplicateDetectionService } from '../duplicate-detection.service';
import type { Product, ProductVariant } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    productVariant: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mocked prisma
    const { prisma } = require('@/lib/db/client');
    mockPrisma = prisma;
    
    // Set default mock implementations (return null/empty by default)
    mockPrisma.productVariant.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.product.findMany.mockResolvedValue([]);
    
    // Create service instance
    service = new DuplicateDetectionService();
  });

  describe('findDuplicates - Level 1: SKU Match', () => {
    it('should find duplicate by SKU with confidence 1.0', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        title: 'Test Product',
        description: 'Test description',
        handle: 'test-product',
        brandId: null,
        vendor: null,
        options: null,
        isShared: false,
        categories: [],
        images: [],
        rawPayload: null,
        lastModifiedAt: new Date(),
        lastModifiedBy: null,
        conflictDetected: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockVariantWithProduct = {
        id: 'var-1',
        sku: 'TEST-SKU-123',
        productId: 'prod-1',
        product: mockProduct // Include the product relation
      };

      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariantWithProduct);

      // Act
      const result = await service.findDuplicates({
        sku: 'TEST-SKU-123',
        handle: 'test-product',
        title: 'Test Product'
      });

      // Assert
      expect(result.found).toBe(true);
      expect(result.method).toBe('SKU');
      expect(result.confidence).toBe(1.0);
      expect(result.match?.id).toBe('prod-1');
      expect(mockPrisma.productVariant.findFirst).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU-123' },
        include: { product: true }
      });
    });

    it('should not find duplicate when SKU does not exist', async () => {
      // Arrange
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findDuplicates({
        sku: 'NON-EXISTENT-SKU',
        title: 'Test Product'
      });

      // Assert
      expect(result.found).toBe(false);
      expect(result.method).toBe(null);
      expect(result.confidence).toBe(0);
    });

    it('should exclude specific product from SKU check', async () => {
      // Arrange
      const mockVariant: Partial<ProductVariant> = {
        id: 'var-1',
        sku: 'TEST-SKU-123',
        productId: 'prod-1',
        price: null,
        compareAtPrice: null,
        currency: null,
        featuredImage: null,
        rawPayload: null,
      };

      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);

      // Act
      const result = await service.findDuplicates({
        sku: 'TEST-SKU-123',
        title: 'Test Product',
        excludeId: 'prod-1' // Exclude the found product
      });

      // Assert
      expect(result.found).toBe(false); // Should not match because we excluded it
    });
  });

  describe('findDuplicates - Level 2: Handle Match', () => {
    it('should find duplicate by handle with confidence 0.95', async () => {
      // Arrange
      const mockProduct: Partial<Product> = {
        id: 'prod-2',
        title: 'Another Product',
        description: 'Description',
        handle: 'unique-handle',
        brandId: null,
        vendor: null,
        options: null,
        isShared: false,
        categories: [],
        images: [],
        rawPayload: null,
        lastModifiedAt: new Date(),
        lastModifiedBy: null,
        conflictDetected: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productVariant.findFirst.mockResolvedValue(null); // No SKU match
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct); // Use findFirst not findUnique

      // Act
      const result = await service.findDuplicates({
        sku: null,
        handle: 'unique-handle',
        title: 'Another Product'
      });

      // Assert
      expect(result.found).toBe(true);
      expect(result.method).toBe('HANDLE');
      expect(result.confidence).toBe(0.95);
      expect(result.match?.id).toBe('prod-2');
    });

    it('should skip handle check if no handle provided', async () => {
      // Arrange
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findDuplicates({
        sku: null,
        handle: null,
        title: 'Product Without Handle'
      });

      // Assert
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled(); // Should be findFirst not findUnique
    });
  });

  describe('findDuplicates - Level 3: Title Fuzzy Match', () => {
    it('should find duplicate by similar title with confidence >= 0.85', async () => {
      // Arrange
      const mockProducts: Partial<Product>[] = [
        {
          id: 'prod-3',
          title: 'Nike Running Shoes Blue Size 42',
          description: 'Description',
          handle: 'nike-shoes',
          brandId: null,
          vendor: null,
          options: null,
          isShared: false,
          categories: [],
          images: [],
          rawPayload: null,
          lastModifiedAt: new Date(),
          lastModifiedBy: null,
          conflictDetected: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await service.findDuplicates({
        sku: null,
        handle: null,
        title: 'Nike Running Shoes Blue Size 41' // Very similar title
      });

      // Assert
      expect(result.found).toBe(true);
      expect(result.method).toBe('TITLE');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.match?.id).toBe('prod-3');
    });

    it('should not find duplicate when title similarity is below 0.85', async () => {
      // Arrange
      const mockProducts: Partial<Product>[] = [
        {
          id: 'prod-4',
          title: 'Completely Different Product Name',
          description: 'Description',
          handle: 'different',
          brandId: null,
          vendor: null,
          options: null,
          isShared: false,
          categories: [],
          images: [],
          rawPayload: null,
          lastModifiedAt: new Date(),
          lastModifiedBy: null,
          conflictDetected: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      // Act
      const result = await service.findDuplicates({
        sku: null,
        handle: null,
        title: 'Nike Shoes'
      });

      // Assert
      expect(result.found).toBe(false);
      expect(result.method).toBe(null);
      expect(result.confidence).toBe(0);
    });
  });

  describe('findDuplicates - Priority Order', () => {
    it('should prioritize SKU over Handle and Title', async () => {
      // Arrange: Setup all three potential matches
      const mockProductSku: Partial<Product> = {
        id: 'prod-sku',
        title: 'Product Found by SKU',
        handle: 'product-sku',
        description: null,
        brandId: null,
        vendor: null,
        options: null,
        isShared: false,
        categories: [],
        images: [],
        rawPayload: null,
        lastModifiedAt: new Date(),
        lastModifiedBy: null,
        conflictDetected: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockVariantWithProduct = {
        id: 'var-1',
        sku: 'SKU-123',
        productId: 'prod-sku',
        product: mockProductSku // Include product relation
      };

      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariantWithProduct);

      // Act
      const result = await service.findDuplicates({
        sku: 'SKU-123',
        handle: 'some-handle',
        title: 'Some Title'
      });

      // Assert
      expect(result.found).toBe(true);
      expect(result.method).toBe('SKU'); // Should use SKU, not Handle or Title
      expect(result.confidence).toBe(1.0);
      expect(result.match?.id).toBe('prod-sku');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', async () => {
      // Arrange
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      mockPrisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert - Should not throw
      await expect(
        service.findDuplicates({
          sku: null,
          handle: null,
          title: ''
        })
      ).resolves.not.toThrow();
    });

    it('should handle null values for all parameters', async () => {
      // Arrange
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findDuplicates({
        sku: null,
        handle: null,
        title: 'Minimal Product'
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.found).toBe(false);
    });
  });
});

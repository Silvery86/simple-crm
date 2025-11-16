/**
 * Duplicate Detection Service
 * 
 * Purpose: Detect duplicate products using 3-level strategy
 * Priority: SKU (1.0) > Handle (0.95) > Title (0.85+)
 * 
 * Use Cases:
 * - Import products from WooCommerce/Shopify
 * - Manual product creation
 * - Bulk product operations
 */

import { Product } from '@prisma/client';
import { prisma } from '@/lib/db/client';

export interface DuplicateCheckResult {
  found: boolean;
  match: Product | null;
  method: 'SKU' | 'HANDLE' | 'TITLE' | null;
  confidence: number; // 0-1 (0% - 100%)
  similarityScore?: number; // Only for title matching
}

export interface DuplicateCheckInput {
  sku?: string | null;
  handle?: string | null;
  title: string;
  excludeId?: string; // Exclude this product ID from search (for updates)
}

export class DuplicateDetectionService {
  private readonly TITLE_SIMILARITY_THRESHOLD = 0.85; // 85% similarity required

  /**
   * Main method: Find duplicate product using 3-level detection
   * 
   * Level 1: Check by SKU (exact match, confidence 1.0)
   * Level 2: Check by handle (exact match, confidence 0.95)
   * Level 3: Check by title (fuzzy match, confidence 0.85+)
   * 
   * @param input - Product data to check
   * @returns DuplicateCheckResult with match and confidence
   */
  async findDuplicates(input: DuplicateCheckInput): Promise<DuplicateCheckResult> {
    // Level 1: Check by SKU (highest priority)
    if (input.sku) {
      const skuMatch = await this.checkBySku(input.sku, input.excludeId);
      if (skuMatch) {
        return {
          found: true,
          match: skuMatch,
          method: 'SKU',
          confidence: 1.0
        };
      }
    }

    // Level 2: Check by handle
    if (input.handle) {
      const handleMatch = await this.checkByHandle(input.handle, input.excludeId);
      if (handleMatch) {
        return {
          found: true,
          match: handleMatch,
          method: 'HANDLE',
          confidence: 0.95
        };
      }
    }

    // Level 3: Check by title (fuzzy matching)
    const titleMatch = await this.checkByTitle(input.title, input.excludeId);
    if (titleMatch && titleMatch.similarity >= this.TITLE_SIMILARITY_THRESHOLD) {
      return {
        found: true,
        match: titleMatch.product,
        method: 'TITLE',
        confidence: titleMatch.similarity,
        similarityScore: titleMatch.similarity
      };
    }

    // No duplicates found
    return {
      found: false,
      match: null,
      method: null,
      confidence: 0
    };
  }

  /**
   * Level 1: Check by SKU (exact match via ProductVariant)
   * 
   * @param sku - SKU to search for
   * @param excludeId - Product ID to exclude from search
   * @returns Product if found, null otherwise
   */
  private async checkBySku(sku: string, excludeId?: string): Promise<Product | null> {
    const variant = await prisma.productVariant.findFirst({
      where: {
        sku: sku,
        productId: excludeId ? { not: excludeId } : undefined
      },
      include: {
        product: true
      }
    });

    return variant?.product || null;
  }

  /**
   * Level 2: Check by handle (exact match)
   * 
   * @param handle - Product handle to search for
   * @param excludeId - Product ID to exclude from search
   * @returns Product if found, null otherwise
   */
  private async checkByHandle(handle: string, excludeId?: string): Promise<Product | null> {
    const product = await prisma.product.findFirst({
      where: {
        handle: handle,
        id: excludeId ? { not: excludeId } : undefined
      }
    });

    return product;
  }

  /**
   * Level 3: Check by title (fuzzy matching using Levenshtein distance)
   * 
   * Algorithm:
   * 1. Get all products with similar title (contains key words)
   * 2. Calculate Levenshtein distance for each
   * 3. Convert to similarity score (0-1)
   * 4. Return best match if above threshold
   * 
   * @param title - Product title to search for
   * @param excludeId - Product ID to exclude from search
   * @returns Best match with similarity score, or null
   */
  private async checkByTitle(
    title: string, 
    excludeId?: string
  ): Promise<{ product: Product; similarity: number } | null> {
    // Normalize title for comparison
    const normalizedTitle = this.normalizeString(title);
    
    // Extract key words (remove common words)
    const keywords = this.extractKeywords(normalizedTitle);
    
    if (keywords.length === 0) {
      return null;
    }

    // Search for products with any of the keywords in title
    // Using case-insensitive LIKE for initial filtering
    const candidates = await prisma.product.findMany({
      where: {
        OR: keywords.map(keyword => ({
          title: {
            contains: keyword,
            mode: 'insensitive' as const
          }
        })),
        id: excludeId ? { not: excludeId } : undefined
      },
      take: 50 // Limit candidates for performance
    });

    if (candidates.length === 0) {
      return null;
    }

    // Calculate similarity for each candidate
    let bestMatch: { product: Product; similarity: number } | null = null;

    for (const candidate of candidates) {
      const candidateTitle = this.normalizeString(candidate.title);
      const similarity = this.calculateSimilarity(normalizedTitle, candidateTitle);

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { product: candidate, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * 
   * Similarity = 1 - (distance / maxLength)
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1.0;
    
    const similarity = 1 - (distance / maxLength);
    return Math.max(0, similarity); // Ensure non-negative
  }

  /**
   * Levenshtein Distance Algorithm
   * 
   * Calculates minimum number of single-character edits needed
   * to change one string into another.
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance (number of operations)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create 2D array for dynamic programming
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix using dynamic programming
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deletion
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Normalize string for comparison
   * 
   * - Convert to lowercase
   * - Remove extra whitespace
   * - Remove special characters
   * 
   * @param str - String to normalize
   * @returns Normalized string
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')           // Multiple spaces -> single space
      .replace(/[^\w\s-]/g, '');      // Remove special chars except dash
  }

  /**
   * Extract keywords from title
   * 
   * Removes common words (stop words) to focus on meaningful terms
   * 
   * @param title - Normalized title
   * @returns Array of keywords
   */
  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'can', 'could', 'may', 'might', 'must', 'shall'
    ]);

    const words = title.split(' ').filter(word => {
      return word.length >= 3 && !stopWords.has(word);
    });

    return words;
  }

  /**
   * Batch check: Find duplicates for multiple products
   * 
   * Useful for bulk import operations
   * 
   * @param inputs - Array of products to check
   * @returns Array of duplicate check results
   */
  async findDuplicatesBatch(inputs: DuplicateCheckInput[]): Promise<DuplicateCheckResult[]> {
    const results: DuplicateCheckResult[] = [];

    for (const input of inputs) {
      const result = await this.findDuplicates(input);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all duplicates in database (for cleanup)
   * 
   * Finds products with same SKU or handle
   * 
   * @returns Array of duplicate groups
   */
  async findAllDuplicates(): Promise<Array<{
    type: 'SKU' | 'HANDLE';
    value: string;
    products: Product[];
  }>> {
    const duplicates: Array<{
      type: 'SKU' | 'HANDLE';
      value: string;
      products: Product[];
    }> = [];

    // Find duplicate SKUs
    const skuDuplicates = await prisma.productVariant.groupBy({
      by: ['sku'],
      where: {
        sku: { not: null }
      },
      having: {
        sku: {
          _count: {
            gt: 1
          }
        }
      }
    });

    for (const group of skuDuplicates) {
      if (!group.sku) continue;

      const variants = await prisma.productVariant.findMany({
        where: { sku: group.sku },
        include: { product: true }
      });

      duplicates.push({
        type: 'SKU',
        value: group.sku,
        products: variants.map(v => v.product)
      });
    }

    // Find duplicate handles
    const handleDuplicates = await prisma.product.groupBy({
      by: ['handle'],
      where: {
        handle: { not: null }
      },
      having: {
        handle: {
          _count: {
            gt: 1
          }
        }
      }
    });

    for (const group of handleDuplicates) {
      if (!group.handle) continue;

      const products = await prisma.product.findMany({
        where: { handle: group.handle }
      });

      duplicates.push({
        type: 'HANDLE',
        value: group.handle,
        products
      });
    }

    return duplicates;
  }
}

// Export singleton instance
export const duplicateDetectionService = new DuplicateDetectionService();

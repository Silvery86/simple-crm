'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, ChevronLeft, ChevronRight, FileBox } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  categories: string[];
  images: string[];
  variants: Array<{
    id: string;
    price: number;
  }>;
}

/**
 * Purpose: Shared Product Catalog page with filtering, search, and bulk selection.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Catalog UI with product table and filters.
 */
export default function SharedCatalogPage() {
  const { t } = useLang();
  
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  
  // Stats
  const [total, setTotal] = useState(0);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Purpose: Fetch products from API with filters.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when products are fetched.
   */
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        isShared: 'true',
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(cat => params.append('categories', cat));
      }
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      
      if (!response.ok) {
        console.error('❌ API Response not OK:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success && data.data) {
        // API returns { success, data: products[], meta: {...} }
        const productList = Array.isArray(data.data) ? data.data : [];
        const total = data.meta?.total || productList.length;
        
        setProducts(productList);
        setTotal(total);
        
        // Extract unique categories
        const categories = new Set<string>();
        productList.forEach((p: Product) => {
          if (p.categories && Array.isArray(p.categories)) {
            p.categories.forEach(cat => categories.add(cat));
          }
        });
        setAllCategories(Array.from(categories).sort());
      } else {
        // Handle empty or error response
        setProducts([]);
        setTotal(0);
        setAllCategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
      setTotal(0);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  /**
   * Purpose: Handle search form submission.
   * Params:
   *   - e: React.FormEvent — Form event.
   * Returns:
   *   - void
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  /**
   * Purpose: Toggle select all products on current page.
   * Params: N/A
   * Returns:
   *   - void
   */
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  /**
   * Purpose: Toggle selection for a single product.
   * Params:
   *   - id: string — Product ID.
   * Returns:
   *   - void
   */
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  /**
   * Purpose: Get price range for a product from its variants.
   * Params:
   *   - product: Product — Product object.
   * Returns:
   *   - string — Price range string.
   */
  const getPriceRange = (product: Product): string => {
    if (!product.variants || product.variants.length === 0) return 'N/A';
    
    const prices = product.variants.map(v => v.price).filter(p => p != null);
    if (prices.length === 0) return 'N/A';
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    if (min === max) {
      return `$${min.toFixed(2)}`;
    }
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  const totalPages = Math.ceil(total / limit);
  const isAllSelected = products.length > 0 && selectedIds.size === products.length;

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shared Product Catalog</h1>
          <p className="text-muted-foreground mt-2">
            Browse and select products from the shared catalog
          </p>
        </div>
        
        {selectedIds.size > 0 && (
          <Button variant="default">
            Add {selectedIds.size} to Store
          </Button>
        )}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Shared Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Categories</label>
            <Select
              value={selectedCategories[0] || ''}
              onValueChange={(value: string) => {
                if (value === 'all') {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories([value]);
                }
                setPage(1);
                fetchProducts();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="999.99"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={() => {
              setPage(1);
              fetchProducts();
            }}
            variant="secondary"
            className="w-full"
          >
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Products</CardTitle>
          <Select
            value={limit.toString()}
            onValueChange={(value: string) => {
              setLimit(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <FileBox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or import products from Shopify
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Price Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <FileBox className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.categories && product.categories.length > 0 ? (
                            <>
                              {product.categories.slice(0, 3).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                                >
                                  {cat}
                                </span>
                              ))}
                              {product.categories.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{product.categories.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">No categories</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.variants?.length || 0}</TableCell>
                      <TableCell className="font-medium">
                        {getPriceRange(product)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} products
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

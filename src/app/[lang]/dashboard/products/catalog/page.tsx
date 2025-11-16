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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Search, Filter, ChevronLeft, ChevronRight, FileBox, Eye, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ProductVariant {
  id: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string | null;
  options?: any;
}

interface Product {
  id: string;
  title: string;
  description?: string | null;
  categories: string[];
  images: string[];
  variants: ProductVariant[];
}

interface Store {
  id: string;
  name: string;
  platform: string;
  isActive: boolean;
}

/**
 * Purpose: Shared Product Catalog page with filtering, search, and bulk selection.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Catalog UI with product table and filters.
 */
export default function SharedCatalogPage() {
  const { t } = useLang();
  const toast = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Stores
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [isAddingToStore, setIsAddingToStore] = useState(false);
  
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
  
  // Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchStores();
  }, []);

  /**
   * Purpose: Fetch active stores from API.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when stores are fetched.
   */
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores?isActive=true');
      const data = await res.json();
      if (data.success) {
        setStores(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedStoreId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

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
        const productList = Array.isArray(data.data) ? data.data : [];
        const total = data.meta?.total || productList.length;
        
        setProducts(productList);
        setTotal(total);
        
        const categories = new Set<string>();
        productList.forEach((p: Product) => {
          if (p.categories && Array.isArray(p.categories)) {
            p.categories.forEach(cat => categories.add(cat));
          }
        });
        setAllCategories(Array.from(categories).sort());
      } else {
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
   * Purpose: Convert price to number (handles Prisma Decimal).
   * Params:
   *   - price: any — Price value (can be number, string, or Decimal).
   * Returns:
   *   - number — Parsed price as number.
   */
  const parsePrice = (price: any): number => {
    if (price === null || price === undefined) return 0;
    if (typeof price === 'number') return price;
    if (typeof price === 'string') return parseFloat(price) || 0;
    return parseFloat(price.toString()) || 0;
  };

  /**
   * Purpose: Get badge color for category.
   * Params:
   *   - index: number — Category index.
   * Returns:
   *   - string — Tailwind classes for badge color.
   */
  const getCategoryBadgeColor = (index: number): string => {
    const colors = [
      'bg-blue-500 text-white dark:bg-blue-600',
      'bg-green-500 text-white dark:bg-green-600',
      'bg-purple-500 text-white dark:bg-purple-600',
      'bg-orange-500 text-white dark:bg-orange-600',
      'bg-pink-500 text-white dark:bg-pink-600',
      'bg-indigo-500 text-white dark:bg-indigo-600',
      'bg-cyan-500 text-white dark:bg-cyan-600',
      'bg-amber-500 text-white dark:bg-amber-600',
    ];
    return colors[index % colors.length];
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

  /**
   * Purpose: Add selected product to store.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when product is added.
   */
  const handleAddToStore = async () => {
    if (!selectedProduct || !selectedStoreId) {
      toast.error('Error', 'Please select a store');
      return;
    }

    setIsAddingToStore(true);
    try {
      const res = await fetch('/api/products/add-to-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          storeId: selectedStoreId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          'Success',
          `Added "${data.meta.productTitle}" to "${data.meta.storeName}"`
        );
        setIsModalOpen(false);
      } else {
        // Handle specific error cases
        if (data.error.code === 'ALREADY_MAPPED') {
          toast.warning('Already Added', 'This product is already in the selected store');
        } else {
          toast.error('Error', data.error.message || 'Failed to add product to store');
        }
      }
    } catch (error: any) {
      console.error('Failed to add product to store:', error);
      toast.error('Error', 'Failed to add product to store');
    } finally {
      setIsAddingToStore(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const isAllSelected = products.length > 0 && selectedIds.size === products.length;

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Shared Product Catalog</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {total} Products
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and select products from shared catalog
          </p>
        </div>
        
        {selectedIds.size > 0 && (
          <Button variant="default" size="sm">
            Add {selectedIds.size} to Store
          </Button>
        )}
      </div>

      {/* Compact Filters Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setPage(1);
                      fetchProducts();
                    }
                  }}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-48">
              <Select
                value={selectedCategories[0] || 'all'}
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
                <SelectTrigger className="h-9">
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
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 h-9"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 h-9"
              />
            </div>

            <Button
              onClick={() => {
                setPage(1);
                fetchProducts();
              }}
              size="sm"
              variant="secondary"
              className="h-9"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base font-semibold">Products ({total})</CardTitle>
          <Select
            value={limit.toString()}
            onValueChange={(value: string) => {
              setLimit(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
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
                    <TableHead className="w-24">Image</TableHead>
                    <TableHead className="py-2 text-xs">Title</TableHead>
                    <TableHead className="py-2 text-xs">Categories</TableHead>
                    <TableHead className="py-2 text-xs">Variants</TableHead>
                    <TableHead className="py-2 text-xs">Price Range</TableHead>
                    <TableHead className="py-2 text-xs w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell className="py-3">
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={56}
                            height={56}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                            <FileBox className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium max-w-xs">
                        <div className="line-clamp-2">{product.title}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {product.categories && product.categories.length > 0 ? (
                            <>
                              {product.categories.slice(0, 2).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary"
                                >
                                  {cat}
                                </span>
                              ))}
                              {product.categories.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{product.categories.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm">{product.variants?.length || 0}</TableCell>
                      <TableCell className="py-3 text-sm font-medium">
                        {getPriceRange(product)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedVariant(product.variants?.[0] || null);
                            setSelectedImageIndex(0);
                            setIsModalOpen(true);
                          }}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {/* Product Detail Modal */}
      <Dialog 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedVariant(null);
            setSelectedImageIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6 p-6">
              {/* Left Side - Images Gallery */}
              <div className="space-y-4">
                {/* Main Image */}
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={selectedProduct.images[selectedImageIndex]}
                      alt={selectedProduct.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center">
                    <FileBox className="h-20 w-20 text-muted-foreground" />
                  </div>
                )}

                {/* Thumbnail Gallery */}
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${selectedProduct.title} - ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side - Product Summary */}
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-6 overflow-y-auto">
                  {/* Title & Categories */}
                  <div>
                    <DialogTitle className="text-2xl font-bold mb-3">
                      {selectedProduct.title}
                    </DialogTitle>
                    
                    {selectedProduct.categories && selectedProduct.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getCategoryBadgeColor(idx)}`}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="space-y-3">
                    {selectedVariant ? (
                      <>
                        <div className="space-y-2">
                          {(() => {
                            const price = parsePrice(selectedVariant.price);
                            const compareAt = parsePrice(selectedVariant.compareAtPrice);
                            const hasDiscount = compareAt > 0 && compareAt > price;
                            
                            // Debug log
                            console.log('Selected Variant:', {
                              sku: selectedVariant.sku,
                              price: selectedVariant.price,
                              compareAtPrice: selectedVariant.compareAtPrice,
                              parsedPrice: price,
                              parsedCompareAt: compareAt,
                              hasDiscount
                            });

                            return (
                              <>
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  {/* Sale Price (RED if on sale, normal if not) */}
                                  <span className={`text-3xl font-bold ${
                                    hasDiscount ? 'text-red-600 dark:text-red-500' : 'text-foreground'
                                  }`}>
                                    ${price.toFixed(2)}
                                  </span>
                                  
                                  {/* Original Price (strikethrough) and Save Badge */}
                                  {hasDiscount && (
                                    <>
                                      <span className="text-2xl text-muted-foreground line-through">
                                        ${compareAt.toFixed(2)}
                                      </span>
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-red-500 text-white dark:bg-red-600">
                                        Save {((compareAt - price) / compareAt * 100).toFixed(0)}%
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                {selectedVariant.sku && (
                                  <p className="text-sm text-muted-foreground">
                                    SKU: <span className="font-mono">{selectedVariant.sku}</span>
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground italic">
                        Select a variant to see pricing
                      </div>
                    )}
                  </div>

                  {/* Variant Selection */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">
                        Variants ({selectedProduct.variants.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariant(variant)}
                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:border-primary whitespace-nowrap ${
                              selectedVariant?.id === variant.id
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background'
                            }`}
                          >
                            {variant.sku || `Variant ${selectedProduct.variants.indexOf(variant) + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description at bottom */}
                  {selectedProduct.description && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3">Description</h3>
                      <div 
                        className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedProduct.description
                            .replace(/<p data-start="[^"]*" data-end="[^"]*">/g, '<p>')
                            .replace(/<li data-start="[^"]*" data-end="[^"]*">/g, '<li>')
                            .replace(/<strong data-start="[^"]*" data-end="[^"]*">/g, '<strong>')
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions - Fixed at bottom */}
                <div className="space-y-3 pt-4 border-t mt-4">
                  {/* Store Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">
                      Select Store
                    </label>
                    <Select 
                      value={selectedStoreId} 
                      onValueChange={setSelectedStoreId}
                      disabled={isAddingToStore}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a store..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.length === 0 ? (
                          <SelectItem value="no-stores" disabled>
                            No active stores available
                          </SelectItem>
                        ) : (
                          stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} ({store.platform})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1"
                      disabled={isAddingToStore}
                    >
                      Close
                    </Button>
                    <Button 
                      className="flex-1"
                      disabled={!selectedStoreId || stores.length === 0 || isAddingToStore}
                      onClick={handleAddToStore}
                    >
                      {isAddingToStore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add to Store'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit2,
  Check,
  X,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PriceEntry {
  storeId: string;
  storeName: string;
  price: number;
  compareAtPrice: number | null;
  currency: string | null;
  priceSource: 'master' | 'override' | 'adjustment';
  adjustment: {
    adjustmentType: 'markup' | 'discount' | 'fixed';
    value: number;
    unit: 'percent' | 'amount';
  } | null;
}

interface ProductData {
  product: {
    id: string;
    title: string;
    masterPrice: number;
    masterCurrency: string | null;
  };
  stores: PriceEntry[];
}

interface PriceComparisonDashboardProps {
  productId: string;
  productData: ProductData;
  lang: string;
}

export default function PriceComparisonDashboard({
  productId,
  productData: initialData,
  lang,
}: PriceComparisonDashboardProps) {
  const [productData, setProductData] = useState<ProductData>(initialData);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCompareAt, setEditCompareAt] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const prices = productData.stores.map((s) => s.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceSpread = maxPrice - minPrice;

    return {
      avgPrice: avgPrice.toFixed(2),
      maxPrice: maxPrice.toFixed(2),
      minPrice: minPrice.toFixed(2),
      priceSpread: priceSpread.toFixed(2),
      masterPrice: productData.product.masterPrice.toFixed(2),
    };
  }, [productData]);

  /**
   * Purpose: Start editing a store price
   * Params:
   *   - store: PriceEntry - Store to edit
   * Returns:
   *   - void
   */
  const handleEditStart = (store: PriceEntry) => {
    setEditingRow(store.storeId);
    setEditPrice(store.price.toString());
    setEditCompareAt(store.compareAtPrice?.toString() || '');
  };

  /**
   * Purpose: Cancel editing
   * Returns:
   *   - void
   */
  const handleEditCancel = () => {
    setEditingRow(null);
    setEditPrice('');
    setEditCompareAt('');
  };

  /**
   * Purpose: Save edited price
   * Params:
   *   - storeId: string - Store ID
   * Returns:
   *   - Promise<void>
   */
  const handleEditSave = async (storeId: string) => {
    const price = parseFloat(editPrice);
    const compareAtPrice = editCompareAt ? parseFloat(editCompareAt) : null;

    if (isNaN(price) || price < 0) {
      toast({
        title: 'Invalid Price',
        description: 'Price must be a non-negative number',
        variant: 'destructive',
      });
      return;
    }

    if (compareAtPrice !== null && (isNaN(compareAtPrice) || compareAtPrice < 0)) {
      toast({
        title: 'Invalid Compare At Price',
        description: 'Compare at price must be a non-negative number',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(
        `/api/stores/${storeId}/products/${productId}/price`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'custom',
            price,
            compareAtPrice,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update price');
      }

      // Refresh product data
      const refreshRes = await fetch(`/api/products/${productId}/prices`);
      const refreshData = await refreshRes.json();

      if (refreshData.success) {
        setProductData(refreshData.data);
      }

      toast({
        title: 'Price Updated',
        description: `Successfully updated price for store ${storeId}`,
      });

      handleEditCancel();
    } catch (error: any) {
      console.error('Failed to update price:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update price',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Purpose: Export prices to CSV
   * Returns:
   *   - void
   */
  const handleExport = () => {
    const headers = [
      'Store',
      'Price',
      'Compare At Price',
      'Currency',
      'Price Source',
      'Adjustment Type',
      'Adjustment Value',
    ];

    const rows = productData.stores.map((store) => [
      store.storeName,
      store.price.toFixed(2),
      store.compareAtPrice?.toFixed(2) || '',
      store.currency || productData.product.masterCurrency || 'USD',
      store.priceSource,
      store.adjustment?.adjustmentType || '',
      store.adjustment
        ? `${store.adjustment.value}${store.adjustment.unit === 'percent' ? '%' : ''}`
        : '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productData.product.title.replace(/[^a-z0-9]/gi, '_')}_prices.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Price comparison exported to CSV',
    });
  };

  /**
   * Purpose: Get badge color based on price source
   * Params:
   *   - source: 'master' | 'override' | 'adjustment'
   * Returns:
   *   - string - Badge variant
   */
  const getSourceBadgeVariant = (
    source: 'master' | 'override' | 'adjustment'
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (source) {
      case 'master':
        return 'default';
      case 'override':
        return 'secondary';
      case 'adjustment':
        return 'outline';
    }
  };

  /**
   * Purpose: Get price difference percentage from master
   * Params:
   *   - price: number - Store price
   * Returns:
   *   - number - Percentage difference
   */
  const getPriceDifference = (price: number): number => {
    const masterPrice = productData.product.masterPrice;
    if (masterPrice === 0) return 0;
    return ((price - masterPrice) / masterPrice) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Master Price
          </div>
          <div className="text-2xl font-bold">${stats.masterPrice}</div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Highest Price
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${stats.maxPrice}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Lowest Price
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            ${stats.minPrice}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Average Price
          </div>
          <div className="text-2xl font-bold">${stats.avgPrice}</div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Price Spread
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            ${stats.priceSpread}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {productData.stores.length} store{productData.stores.length !== 1 ? 's' : ''}{' '}
          showing prices
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Price Comparison Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Compare At</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productData.stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No stores found for this product
                </TableCell>
              </TableRow>
            ) : (
              productData.stores.map((store) => {
                const isEditing = editingRow === store.storeId;
                const priceDiff = getPriceDifference(store.price);

                return (
                  <TableRow key={store.storeId}>
                    <TableCell className="font-medium">{store.storeName}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-8 w-24"
                          disabled={isUpdating}
                        />
                      ) : (
                        <span className="font-mono">${store.price.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCompareAt}
                          onChange={(e) => setEditCompareAt(e.target.value)}
                          placeholder="Optional"
                          className="h-8 w-24"
                          disabled={isUpdating}
                        />
                      ) : store.compareAtPrice ? (
                        <span className="font-mono text-muted-foreground line-through">
                          ${store.compareAtPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.currency || productData.product.masterCurrency || 'USD'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSourceBadgeVariant(store.priceSource)}>
                        {store.priceSource}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {store.adjustment ? (
                        <div className="text-sm">
                          <span className="font-medium">
                            {store.adjustment.adjustmentType}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            {store.adjustment.value}
                            {store.adjustment.unit === 'percent' ? '%' : '$'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {priceDiff > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : priceDiff < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span
                          className={
                            priceDiff > 0
                              ? 'text-green-600 dark:text-green-400'
                              : priceDiff < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {priceDiff > 0 ? '+' : ''}
                          {priceDiff.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSave(store.storeId)}
                            disabled={isUpdating}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                            disabled={isUpdating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(store)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

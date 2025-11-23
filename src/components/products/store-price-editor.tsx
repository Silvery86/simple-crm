'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Percent, Calculator, X } from 'lucide-react';

type PriceMode = 'custom' | 'adjustment' | 'clear';
type AdjustmentType = 'markup' | 'discount' | 'fixed';
type AdjustmentUnit = 'percent' | 'amount';

interface StorePriceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  storeName: string;
  productId: string;
  productTitle: string;
  masterPrice: number;
  currentPrice?: number;
  currentCompareAt?: number;
  currentPriceSource?: 'master' | 'override' | 'adjustment';
  onPriceUpdated?: () => void;
}

export default function StorePriceEditor({
  open,
  onOpenChange,
  storeId,
  storeName,
  productId,
  productTitle,
  masterPrice,
  currentPrice,
  currentCompareAt,
  currentPriceSource,
  onPriceUpdated,
}: StorePriceEditorProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<PriceMode>('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom price mode
  const [customPrice, setCustomPrice] = useState<string>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('');

  // Adjustment mode
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('markup');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [adjustmentUnit, setAdjustmentUnit] = useState<AdjustmentUnit>('percent');

  // Calculated preview price
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);

  /**
   * Purpose: Reset form when dialog opens/closes
   */
  useEffect(() => {
    if (open) {
      // Initialize with current values if available
      if (currentPriceSource === 'override' && currentPrice) {
        setMode('custom');
        setCustomPrice(currentPrice.toString());
        setCompareAtPrice(currentCompareAt?.toString() || '');
      } else if (currentPriceSource === 'adjustment') {
        setMode('adjustment');
      } else {
        setMode('custom');
        setCustomPrice(masterPrice.toString());
        setCompareAtPrice('');
      }
      setAdjustmentType('markup');
      setAdjustmentValue('');
      setAdjustmentUnit('percent');
      setPreviewPrice(null);
    }
  }, [open, currentPrice, currentCompareAt, currentPriceSource, masterPrice]);

  /**
   * Purpose: Calculate preview price for adjustment mode
   */
  useEffect(() => {
    if (mode === 'adjustment' && adjustmentValue) {
      const value = parseFloat(adjustmentValue);
      if (!isNaN(value)) {
        let calculated = masterPrice;
        
        if (adjustmentType === 'markup') {
          if (adjustmentUnit === 'percent') {
            calculated = masterPrice * (1 + value / 100);
          } else {
            calculated = masterPrice + value;
          }
        } else if (adjustmentType === 'discount') {
          if (adjustmentUnit === 'percent') {
            calculated = masterPrice * (1 - value / 100);
          } else {
            calculated = masterPrice - value;
          }
        } else if (adjustmentType === 'fixed') {
          calculated = value;
        }
        
        setPreviewPrice(Math.max(0, calculated));
      } else {
        setPreviewPrice(null);
      }
    } else if (mode === 'custom' && customPrice) {
      const value = parseFloat(customPrice);
      if (!isNaN(value)) {
        setPreviewPrice(value);
      } else {
        setPreviewPrice(null);
      }
    } else {
      setPreviewPrice(null);
    }
  }, [mode, adjustmentType, adjustmentValue, adjustmentUnit, customPrice, masterPrice]);

  /**
   * Purpose: Handle form submission
   */
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let body: any = {};

      if (mode === 'clear') {
        body = { type: 'clear' };
      } else if (mode === 'custom') {
        const price = parseFloat(customPrice);
        if (isNaN(price) || price < 0) {
          throw new Error('Invalid price value');
        }
        
        body = {
          type: 'custom',
          price,
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        };
      } else if (mode === 'adjustment') {
        const value = parseFloat(adjustmentValue);
        if (isNaN(value)) {
          throw new Error('Invalid adjustment value');
        }
        
        body = {
          type: 'adjustment',
          adjustmentType,
          value,
          unit: adjustmentUnit,
        };
      }

      const res = await fetch(
        `/api/stores/${storeId}/products/${productId}/price`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update price');
      }

      toast({
        title: 'Price Updated',
        description: `Successfully updated price for ${storeName}`,
      });

      onOpenChange(false);
      onPriceUpdated?.();
    } catch (error: any) {
      console.error('Failed to update price:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update price',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Store Price</DialogTitle>
          <DialogDescription>
            Set custom price or adjustment rule for <strong>{productTitle}</strong> in{' '}
            <strong>{storeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Master Price Info */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Master Price</div>
                <div className="text-2xl font-bold">${masterPrice.toFixed(2)}</div>
              </div>
              {currentPriceSource && (
                <Badge variant="outline" className="ml-2">
                  Current: {currentPriceSource}
                </Badge>
              )}
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>Price Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={mode === 'custom' ? 'default' : 'outline'}
                onClick={() => setMode('custom')}
                className="h-auto py-3 flex-col gap-1"
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">Custom Price</span>
              </Button>
              <Button
                type="button"
                variant={mode === 'adjustment' ? 'default' : 'outline'}
                onClick={() => setMode('adjustment')}
                className="h-auto py-3 flex-col gap-1"
              >
                <Calculator className="h-5 w-5" />
                <span className="text-xs">Adjustment Rule</span>
              </Button>
              <Button
                type="button"
                variant={mode === 'clear' ? 'destructive' : 'outline'}
                onClick={() => setMode('clear')}
                className="h-auto py-3 flex-col gap-1"
              >
                <X className="h-5 w-5" />
                <span className="text-xs">Clear Override</span>
              </Button>
            </div>
          </div>

          {/* Custom Price Mode */}
          {mode === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customPrice">Custom Price</Label>
                <Input
                  id="customPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Enter custom price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Compare At Price (Optional)</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Original price for discount display"
                />
              </div>
            </div>
          )}

          {/* Adjustment Mode */}
          {mode === 'adjustment' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markup">Markup (Increase)</SelectItem>
                    <SelectItem value="discount">Discount (Decrease)</SelectItem>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentValue">Value</Label>
                  <Input
                    id="adjustmentValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(e.target.value)}
                    placeholder="Enter value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={adjustmentUnit} onValueChange={(v) => setAdjustmentUnit(v as AdjustmentUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="amount">Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {adjustmentType === 'markup' && (
                  <p>Increase price by {adjustmentUnit === 'percent' ? 'a percentage' : 'an amount'}</p>
                )}
                {adjustmentType === 'discount' && (
                  <p>Decrease price by {adjustmentUnit === 'percent' ? 'a percentage' : 'an amount'}</p>
                )}
                {adjustmentType === 'fixed' && (
                  <p>Set a fixed price regardless of master price</p>
                )}
              </div>
            </div>
          )}

          {/* Clear Mode */}
          {mode === 'clear' && (
            <div className="rounded-lg border border-destructive/50 p-4 bg-destructive/5">
              <p className="text-sm text-muted-foreground">
                This will remove any custom price or adjustment rule for this store.
                The product will use the master price (${masterPrice.toFixed(2)}).
              </p>
            </div>
          )}

          {/* Price Preview */}
          {previewPrice !== null && mode !== 'clear' && (
            <div className="rounded-lg border p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Preview Price</div>
                  <div className="text-3xl font-bold text-primary">
                    ${previewPrice.toFixed(2)}
                  </div>
                </div>
                {previewPrice !== masterPrice && (
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Difference</div>
                    <div className={`text-lg font-semibold ${previewPrice > masterPrice ? 'text-green-600' : 'text-red-600'}`}>
                      {previewPrice > masterPrice ? '+' : ''}
                      ${(previewPrice - masterPrice).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Price'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

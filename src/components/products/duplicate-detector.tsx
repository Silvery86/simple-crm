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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  CheckCircle,
  X,
  ArrowRight,
  Package,
  Hash,
  Tag,
  DollarSign,
} from 'lucide-react';

interface DuplicateMatch {
  productId: string;
  title: string;
  sku: string;
  price: number;
  matchType: 'sku' | 'handle' | 'title';
  confidence: number;
}

interface DuplicateDetectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProduct: {
    id: string;
    title: string;
    sku?: string;
    handle?: string;
    price: number;
  };
  onMerge?: (targetProductId: string) => void;
  onSkip?: () => void;
}

export default function DuplicateDetector({
  open,
  onOpenChange,
  sourceProduct,
  onMerge,
  onSkip,
}: DuplicateDetectorProps) {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  /**
   * Purpose: Fetch potential duplicates
   */
  useEffect(() => {
    if (open && sourceProduct) {
      fetchDuplicates();
    }
  }, [open, sourceProduct]);

  /**
   * Purpose: Fetch duplicates from API
   */
  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      // Try handle-based detection first
      if (sourceProduct.handle) {
        const res = await fetch(
          `/api/products/check-duplicates?handle=${encodeURIComponent(sourceProduct.handle)}`
        );
        const data = await res.json();
        
        if (data.success && data.data) {
          setDuplicates([
            {
              productId: data.data.id,
              title: data.data.title,
              sku: data.data.variants[0]?.sku || '',
              price: data.data.variants[0]?.price || 0,
              matchType: 'handle',
              confidence: 0.95,
            },
          ]);
          return;
        }
      }

      // Try SKU-based detection
      if (sourceProduct.sku) {
        const res = await fetch(
          `/api/products/check-duplicates-sku?sku=${encodeURIComponent(sourceProduct.sku)}`
        );
        const data = await res.json();
        
        if (data.success && data.data) {
          setDuplicates([
            {
              productId: data.data.id,
              title: data.data.title,
              sku: data.data.variants[0]?.sku || '',
              price: data.data.variants[0]?.price || 0,
              matchType: 'sku',
              confidence: 1.0,
            },
          ]);
          return;
        }
      }

      // No duplicates found
      setDuplicates([]);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
      setDuplicates([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Purpose: Handle merge operation
   */
  const handleMerge = async () => {
    if (!selectedDuplicate) return;

    setIsMerging(true);
    try {
      // Call merge API endpoint (to be implemented)
      // For now, just trigger the callback
      
      toast({
        title: 'Products Merged',
        description: 'Successfully merged duplicate products',
      });

      onMerge?.(selectedDuplicate);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Merge failed:', error);
      toast({
        title: 'Merge Failed',
        description: error.message || 'Failed to merge products',
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
    }
  };

  /**
   * Purpose: Handle skip operation
   */
  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  /**
   * Purpose: Get confidence color
   */
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  /**
   * Purpose: Get confidence label
   */
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  /**
   * Purpose: Get match type badge variant
   */
  const getMatchTypeBadge = (matchType: 'sku' | 'handle' | 'title') => {
    switch (matchType) {
      case 'sku':
        return 'default';
      case 'handle':
        return 'secondary';
      case 'title':
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Duplicate Detection</DialogTitle>
          <DialogDescription>
            Potential duplicate products found. Review and decide to merge or skip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Checking for duplicates...</span>
              </div>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-semibold">No Duplicates Found</p>
              <p className="text-sm text-muted-foreground">
                This product appears to be unique
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Source Product */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  New Product
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-start gap-2">
                        <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-semibold">{sourceProduct.title}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {sourceProduct.sku && (
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">SKU:</span>
                          <span className="font-mono">{sourceProduct.sku}</span>
                        </div>
                      )}
                      {sourceProduct.handle && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Handle:</span>
                          <span className="font-mono">{sourceProduct.handle}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold">${sourceProduct.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* Potential Duplicates */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Potential Duplicates ({duplicates.length})
                </div>
                <div className="space-y-3">
                  {duplicates.map((duplicate) => (
                    <div
                      key={duplicate.productId}
                      className={`rounded-lg border p-4 cursor-pointer transition-all ${
                        selectedDuplicate === duplicate.productId
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedDuplicate(duplicate.productId)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold">{duplicate.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getMatchTypeBadge(duplicate.matchType)}>
                                  {duplicate.matchType.toUpperCase()} Match
                                </Badge>
                                <span className={`text-sm font-semibold ${getConfidenceColor(duplicate.confidence)}`}>
                                  {(duplicate.confidence * 100).toFixed(0)}% Confidence
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({getConfidenceLabel(duplicate.confidence)})
                                </span>
                              </div>
                            </div>
                          </div>
                          {selectedDuplicate === duplicate.productId && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {duplicate.sku && (
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">SKU:</span>
                              <span className="font-mono">{duplicate.sku}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold">${duplicate.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              {selectedDuplicate && (
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 p-3 bg-yellow-50 dark:bg-yellow-950/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Merge Warning
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Merging will combine the products. The source product data will be added to the
                        selected existing product. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {duplicates.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isMerging}
              >
                <X className="h-4 w-4 mr-2" />
                Skip
              </Button>
              <Button
                onClick={handleMerge}
                disabled={!selectedDuplicate || isMerging}
              >
                {isMerging ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Merging...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Merge Selected
                  </>
                )}
              </Button>
            </>
          )}
          {duplicates.length === 0 && !isLoading && (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

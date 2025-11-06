'use client';

import { useState } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: 'woocommerce-csv' | 'shopify-csv') => Promise<void>;
  productsCount: number;
}

type ExportFormat = 'woocommerce-csv' | 'shopify-csv';

/**
 * Purpose: Modal component for exporting products to CSV format.
 * Params:
 *   - open: boolean — Whether modal is visible.
 *   - onClose: () => void — Callback when modal closes.
 *   - onExport: (format) => Promise<void> — Callback to export with selected format.
 *   - productsCount: number — Number of products to export.
 * Returns:
 *   - React.ReactNode — Export modal with format selection.
 */
export function ExportModal({ open, onClose, onExport, productsCount }: ExportModalProps) {
  const { t } = useLang();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('woocommerce-csv');
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Purpose: Handle export button click with selected format.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when export is complete.
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formats: Array<{
    value: ExportFormat;
    label: string;
    description: string;
  }> = [
    {
      value: 'woocommerce-csv',
      label: t('page.productsConvert.export.woocommerceCSV') || 'WooCommerce CSV',
      description: t('page.productsConvert.export.woocommerceDesc') || 'Export in WooCommerce CSV format for direct import',
    },
    {
      value: 'shopify-csv',
      label: t('page.productsConvert.export.shopifyCSV') || 'Shopify CSV',
      description: t('page.productsConvert.export.shopifyDesc') || 'Export in Shopify CSV format for bulk import',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('page.productsConvert.export.title') || 'Export Products'}
          </DialogTitle>
          <DialogDescription>
            {t('page.productsConvert.export.description') || 'Choose the export format for your products'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Products Count Info */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-semibold text-foreground text-lg">{productsCount}</span>
              {' '}{t('page.productsConvert.export.productsToExport') || 'products to export'}
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('page.productsConvert.export.selectFormat') || 'Select Export Format'}
            </label>
            <div className="space-y-2">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 relative overflow-hidden',
                    selectedFormat === format.value
                      ? 'border-primary bg-primary/10 shadow-md scale-[1.02] ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  {selectedFormat === format.value && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 rounded-bl-full" />
                  )}
                  <div className="flex items-start gap-3 relative z-10">
                    <div className={cn(
                      'mt-0.5 rounded-full p-1.5 transition-all',
                      selectedFormat === format.value 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {selectedFormat === format.value ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold transition-colors',
                        selectedFormat === format.value ? 'text-primary' : 'text-foreground'
                      )}>
                        {format.label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{format.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              {t('page.productsConvert.export.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {t('page.productsConvert.loading.exporting') || 'Exporting...'}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t('page.productsConvert.export.export') || 'Export'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

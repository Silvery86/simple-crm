'use client';

import { useState } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileJson, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
}

/**
 * Purpose: Modal component for importing Shopify JSON files with drag-and-drop.
 * Params:
 *   - open: boolean — Whether modal is visible.
 *   - onClose: () => void — Callback when modal closes.
 *   - onImport: (data: any[]) => Promise<void> — Callback with parsed product data.
 * Returns:
 *   - React.ReactNode — Import modal with file upload interface.
 */
export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Purpose: Handle file drop event for drag-and-drop upload.
   * Params:
   *   - e: React.DragEvent — Drag event object.
   * Returns:
   *   - void
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type === 'application/json') {
      setFile(droppedFile);
      setError(null);
    } else {
      setError(t('page.productsConvert.import.errors.invalidFile') || 'Please upload a valid JSON file');
    }
  };

  /**
   * Purpose: Handle file input change event.
   * Params:
   *   - e: React.ChangeEvent<HTMLInputElement> — Input change event.
   * Returns:
   *   - void
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  /**
   * Purpose: Process and validate uploaded JSON file, then import products.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when import is complete.
   */
  const handleSubmit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Validate JSON structure
      let products: any[] = [];
      
      if (jsonData.products && Array.isArray(jsonData.products)) {
        products = jsonData.products;
      } else if (Array.isArray(jsonData)) {
        products = jsonData;
      } else {
        throw new Error(t('page.productsConvert.import.errors.notArray') || 'Invalid JSON format. Expected "products" array or array of products.');
      }

      if (products.length === 0) {
        throw new Error(t('page.productsConvert.import.errors.notArray') || 'No products found in the file.');
      }

      // Call parent callback with product data
      await onImport(products);
      
      // Reset and close
      setFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('page.productsConvert.import.errors.parseError') || 'Failed to process file'));
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Purpose: Reset modal state when closing.
   * Params: N/A
   * Returns:
   *   - void
   */
  const handleClose = () => {
    setFile(null);
    setError(null);
    setIsDragging(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('page.productsConvert.import.title') || 'Import Products'}
          </DialogTitle>
          <DialogDescription>
            {t('page.productsConvert.import.description') || 'Upload a Shopify JSON file to import products'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
              isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50',
              file && 'border-green-500 bg-green-500/5 dark:bg-green-500/10'
            )}
            onClick={() => document.getElementById('import-file-input')?.click()}
          >
            <input
              id="import-file-input"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            
            <div className="space-y-3">
              <div className="flex justify-center">
                {file ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <FileJson className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              
              {file ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('page.productsConvert.import.fileSize')}: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {t('page.productsConvert.import.dragDrop') || 'Drag & drop your JSON file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('page.productsConvert.import.orClick') || 'or click to browse'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              {t('page.productsConvert.import.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={!file || isProcessing}>
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {t('page.productsConvert.import.uploading') || 'Processing...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('page.productsConvert.import.submit') || 'Import'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

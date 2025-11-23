'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  duration: number;
}

interface StoreSyncButtonProps {
  storeId: string;
  storeName: string;
  onSyncComplete?: (result: SyncResult) => void;
}

export default function StoreSyncButton({
  storeId,
  storeName,
  onSyncComplete,
}: StoreSyncButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Sync options
  const [pageSize, setPageSize] = useState<string>('100');
  const [maxPages, setMaxPages] = useState<string>('');
  const [modifiedOnly, setModifiedOnly] = useState(false);

  /**
   * Purpose: Handle sync operation
   */
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResult(null);

    try {
      const body: any = {
        pageSize: parseInt(pageSize) || 100,
        modifiedOnly,
      };

      if (maxPages) {
        body.maxPages = parseInt(maxPages);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetch(`/api/stores/${storeId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      clearInterval(progressInterval);
      setSyncProgress(100);

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult(data.data);

      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${data.data.total} products from ${storeName}`,
      });

      onSyncComplete?.(data.data);
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync store',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Purpose: Reset and close modal
   */
  const handleClose = () => {
    if (!isSyncing) {
      setOpen(false);
      setSyncProgress(0);
      setSyncResult(null);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Sync Store
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sync Products</DialogTitle>
            <DialogDescription>
              Sync products from <strong>{storeName}</strong> to the database
            </DialogDescription>
          </DialogHeader>

          {!syncResult ? (
            <div className="space-y-4">
              {/* Sync Options */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pageSize">Products Per Page</Label>
                    <Input
                      id="pageSize"
                      type="number"
                      min="1"
                      max="100"
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      disabled={isSyncing}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPages">Max Pages (Optional)</Label>
                    <Input
                      id="maxPages"
                      type="number"
                      min="1"
                      value={maxPages}
                      onChange={(e) => setMaxPages(e.target.value)}
                      disabled={isSyncing}
                      placeholder="All"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="modifiedOnly"
                    checked={modifiedOnly}
                    onCheckedChange={(checked) => setModifiedOnly(checked as boolean)}
                    disabled={isSyncing}
                  />
                  <Label
                    htmlFor="modifiedOnly"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Sync only modified products since last sync
                  </Label>
                </div>
              </div>

              {/* Progress Indicator */}
              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Syncing...</span>
                    <span className="font-medium">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 ease-out"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="rounded-lg border p-3 bg-muted/50 text-sm text-muted-foreground">
                <p>
                  This will fetch products from {storeName} and sync them to the database.
                  Existing products will be updated, new ones will be created.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    Sync Completed
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {syncResult.total} products processed in {(syncResult.duration / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Created
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {syncResult.created}
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    Updated
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {syncResult.updated}
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Skipped
                  </div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {syncResult.skipped}
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {syncResult.failed}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {syncResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 p-3 bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors ({syncResult.errors.length})
                  </div>
                  <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                    {syncResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="list-disc list-inside">
                        {error}
                      </li>
                    ))}
                    {syncResult.errors.length > 5 && (
                      <li className="text-red-600 dark:text-red-400 font-medium">
                        +{syncResult.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!syncResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSyncing}
                >
                  Cancel
                </Button>
                <Button onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Start Sync'
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleClose}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportLog {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

/**
 * Purpose: Shopify product import page with URL input and live progress tracking.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Shopify import UI with URL input, page range, and live logs.
 */
export default function ShopifyImportPage() {
  const { t } = useLang();
  
  const [storeUrl, setStoreUrl] = useState('');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: 0,
  });
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'overwrite' | 'keepboth' | 'skip'>('skip');

  /**
   * Purpose: Add log message to the log list.
   * Params:
   *   - message: string — Log message.
   *   - type: string — Log type (info, success, error, warning).
   * Returns:
   *   - void
   */
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  /**
   * Purpose: Verify if the URL is a Shopify store.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when verification is complete.
   */
  const handleVerify = async () => {
    if (!storeUrl) {
      addLog('Please enter a store URL', 'error');
      return;
    }

    setIsVerifying(true);
    setLogs([]);
    addLog(`Verifying store: ${storeUrl}`, 'info');

    try {
      const response = await fetch('/api/shopify/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: storeUrl }),
      });

      const data = await response.json();

      if (data.success && data.isShopify) {
        setIsVerified(true);
        addLog('✅ Shopify store verified successfully!', 'success');
      } else {
        setIsVerified(false);
        addLog('❌ This is not a valid Shopify store', 'error');
      }
    } catch (error: any) {
      setIsVerified(false);
      addLog(`❌ Verification failed: ${error.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Purpose: Start importing products from Shopify store.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when import is complete.
   */
  const handleImport = async () => {
    if (!isVerified) {
      addLog('Please verify the store first', 'error');
      return;
    }

    if (startPage < 1 || endPage < startPage) {
      addLog('Invalid page range', 'error');
      return;
    }

    // Show duplicate strategy dialog before importing
    setShowDuplicateDialog(true);
  };

  /**
   * Purpose: Execute import after duplicate strategy is selected.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Resolves when import is complete.
   */
  const executeImport = async () => {
    setShowDuplicateDialog(false);
    setIsImporting(true);
    setStats({ total: 0, success: 0, failed: 0, skipped: 0, current: 0 });
    addLog('\n🚀 Starting import process...', 'info');
    addLog(`📄 Page range: ${startPage} to ${endPage}`, 'info');
    addLog(`🔄 Duplicate strategy: ${duplicateStrategy}`, 'info');
    addLog('⏳ This may take a while (10 products every 3 minutes)', 'warning');

    try {
      // Use fetch with streaming for real-time updates
      const response = await fetch('/api/shopify/import-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: storeUrl,
          startPage,
          endPage,
          duplicateStrategy,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Read the stream
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6); // Remove 'data: ' prefix
              const message = JSON.parse(data);

              if (message.type === 'connected') {
                addLog(message.message, 'info');
              } else if (message.type === 'progress') {
                // Update stats in real-time
                setStats({
                  total: message.data.total,
                  current: message.data.current,
                  success: message.data.success,
                  failed: message.data.failed,
                  skipped: message.data.skipped,
                });
              } else if (message.type === 'log') {
                // Add log entry in real-time
                const logMessage = message.message;
                if (logMessage.startsWith('✅')) {
                  addLog(logMessage, 'success');
                } else if (logMessage.startsWith('❌')) {
                  addLog(logMessage, 'error');
                } else if (logMessage.startsWith('⏳') || logMessage.startsWith('📊')) {
                  addLog(logMessage, 'warning');
                } else {
                  addLog(logMessage, 'info');
                }
              } else if (message.type === 'complete') {
                // Final result
                const result = message.data;
                setStats({
                  total: result.total,
                  success: result.success,
                  failed: result.failed,
                  skipped: result.skipped || 0,
                  current: result.total,
                });
                addLog('\n🎉 Import completed!', 'success');
                setIsImporting(false);
              } else if (message.type === 'error') {
                addLog(`❌ Import error: ${message.message}`, 'error');
                setIsImporting(false);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      addLog(`❌ Import error: ${error.message}`, 'error');
      setIsImporting(false);
    }
  };

  /**
   * Purpose: Get log icon based on type.
   * Params:
   *   - type: string — Log type.
   * Returns:
   *   - React.ReactNode — Icon component.
   */
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shopify Product Import</h1>
        <p className="text-muted-foreground mt-2">
          Import products from Shopify store to shared catalog
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Store Configuration</CardTitle>
          <CardDescription>
            Enter your Shopify store URL and page range to import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Store URL */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Shopify Store URL *
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                disabled={isImporting}
                className="flex-1"
              />
              <Button
                onClick={handleVerify}
                disabled={!storeUrl || isVerifying || isImporting}
                variant={isVerified ? 'secondary' : 'default'}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : isVerified ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verified
                  </>
                ) : (
                  'Verify Store'
                )}
              </Button>
            </div>
          </div>

          {/* Page Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Page
              </label>
              <Input
                type="number"
                min={1}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                disabled={isImporting}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                End Page
              </label>
              <Input
                type="number"
                min={1}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                disabled={isImporting}
              />
            </div>
          </div>

          {/* Import Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Shopify provides 30 products per page. Import rate: 10 products every 3 minutes
              to avoid CDN rate limiting. Estimated time: {Math.ceil(((endPage - startPage + 1) * 30) / 10) * 3} minutes.
            </AlertDescription>
          </Alert>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!isVerified || isImporting}
            className="w-full"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing... ({stats.current}/{stats.total})
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Start Import
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Card */}
      {stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.current}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Skipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Card */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Logs</CardTitle>
            <CardDescription>
              Live progress and error messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 py-1">
                  {getLogIcon(log.type)}
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={
                    log.type === 'error' ? 'text-red-600' :
                    log.type === 'success' ? 'text-green-600' :
                    log.type === 'warning' ? 'text-yellow-600' :
                    'text-foreground'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Strategy Dialog */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Handle Duplicate Products</CardTitle>
              <CardDescription>
                Choose how to handle products that already exist in your catalog
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="strategy"
                    value="skip"
                    checked={duplicateStrategy === 'skip'}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Skip Duplicates</div>
                    <div className="text-sm text-muted-foreground">
                      Keep existing products, don't import duplicates
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="strategy"
                    value="overwrite"
                    checked={duplicateStrategy === 'overwrite'}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Overwrite Existing</div>
                    <div className="text-sm text-muted-foreground">
                      Replace existing products with new data from Shopify
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="strategy"
                    value="keepboth"
                    checked={duplicateStrategy === 'keepboth'}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Keep Both</div>
                    <div className="text-sm text-muted-foreground">
                      Import as new product with modified handle (adds timestamp)
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDuplicateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={executeImport}>
                  Start Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

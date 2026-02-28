'use client';

import { useState, useRef, useCallback } from 'react';
import { verifyShopifyAction } from '@/lib/actions/shopify.actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportLog {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

export interface ImportStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  current: number;
}

// ─── useShopifyVerify ─────────────────────────────────────────────────────────

/**
 * Purpose: Hook to verify a URL is a valid Shopify store using a Server Action.
 * Returns:
 *   - Object with verify function, loading state, and result.
 */
export function useShopifyVerify() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  /**
   * Purpose: Call verifyShopifyAction and return the boolean result.
   * Params:
   *   - url: string — Shopify store URL.
   * Returns:
   *   - Promise<boolean> — True if verified Shopify store.
   */
  const verify = useCallback(async (url: string): Promise<boolean> => {
    setIsVerifying(true);
    setIsVerified(false);
    try {
      const result = await verifyShopifyAction({ url });
      const verified = result.success && (result.data?.isShopify ?? false);
      setIsVerified(verified);
      return verified;
    } catch (error) {
      setIsVerified(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsVerified(false);
  }, []);

  return { verify, isVerifying, isVerified, reset };
}

// ─── useShopifyImportStream ───────────────────────────────────────────────────

/**
 * Purpose: Hook to run a streaming Shopify import via the SSE API endpoint.
 * Note: This uses /api/shopify/import-stream (not a Server Action) because
 *       Server Actions cannot stream SSE responses. The API route calls the
 *       same shopify-import.service.ts — zero logic duplication.
 * Returns:
 *   - Object with startImport, stopImport, logs, stats, and status flags.
 */
export function useShopifyImportStream() {
  const [isImporting, setIsImporting] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    current: 0,
  });
  const abortRef = useRef<AbortController | null>(null);

  const addLog = useCallback((message: string, type: ImportLog['type'] = 'info') => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
  }, []);

  /**
   * Purpose: Start importing products from a Shopify store via streaming endpoint.
   * Params:
   *   - storeUrl: string — The Shopify store URL.
   *   - startPage: number — First page to import.
   *   - endPage: number — Last page to import.
   *   - duplicateStrategy: 'overwrite' | 'keepboth' | 'skip' — Duplicate handling.
   * Returns:
   *   - Promise<void> — Resolves when import stream ends.
   */
  const startImport = useCallback(async (
    storeUrl: string,
    startPage: number,
    endPage: number,
    duplicateStrategy: 'overwrite' | 'keepboth' | 'skip' = 'skip'
  ) => {
    abortRef.current = new AbortController();
    setIsImporting(true);
    setLogs([]);
    setStats({ total: 0, success: 0, failed: 0, skipped: 0, current: 0 });

    addLog(`Starting import from ${storeUrl} (pages ${startPage}–${endPage})`, 'info');

    try {
      const response = await fetch('/api/shopify/import-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, startPage, endPage, duplicateStrategy }),
        signal: abortRef.current.signal,
      });

      if (!response.body) {
        throw new Error('No response stream available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'log') {
                addLog(event.message, event.logType ?? 'info');
              } else if (event.type === 'progress') {
                setStats({
                  total: event.total ?? 0,
                  success: event.success ?? 0,
                  failed: event.failed ?? 0,
                  skipped: event.skipped ?? 0,
                  current: event.current ?? 0,
                });
              } else if (event.type === 'complete') {
                addLog('✅ Import complete!', 'success');
                setStats({
                  total: event.total ?? 0,
                  success: event.success ?? 0,
                  failed: event.failed ?? 0,
                  skipped: event.skipped ?? 0,
                  current: event.total ?? 0,
                });
              } else if (event.type === 'error') {
                addLog(`❌ ${event.message}`, 'error');
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addLog(`❌ Import failed: ${error.message}`, 'error');
      }
    } finally {
      setIsImporting(false);
      abortRef.current = null;
    }
  }, [addLog]);

  /**
   * Purpose: Abort an in-progress import.
   */
  const stopImport = useCallback(() => {
    abortRef.current?.abort();
    setIsImporting(false);
    setLogs((prev) => [...prev, { message: '⛔ Import stopped by user', type: 'warning', timestamp: new Date() }]);
  }, []);

  const resetLogs = useCallback(() => {
    setLogs([]);
    setStats({ total: 0, success: 0, failed: 0, skipped: 0, current: 0 });
  }, []);

  return {
    startImport,
    stopImport,
    resetLogs,
    isImporting,
    logs,
    stats,
  };
}

'use client';

import { useEffect } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Purpose: 500 Server Error page
 * Handles uncaught exceptions and server errors
 * Returns: React.ReactNode — Error UI with recovery options
 */
export default function Error({ error, reset }: ErrorProps) {
  const { t } = useLang();

  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-50"></div>
            <AlertTriangle className="h-24 w-24 text-yellow-600 relative" />
          </div>
        </div>

        {/* Error Code */}
        <div>
          <h1 className="text-6xl font-bold text-foreground">500</h1>
          <p className="text-lg text-muted-foreground mt-2">
            {t('errors.serverError') || 'Server Error'}
          </p>
        </div>

        {/* Error Description */}
        <p className="text-muted-foreground">
          {t('errors.serverErrorDesc') ||
            'Something went wrong on our end. Please try again later.'}
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-red-700 word-wrap">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => reset()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.tryAgain') || 'Try Again'}
          </Button>

          <Link href="/">
            <Button className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t('common.home') || 'Home'}
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            {t('errors.needHelp') || 'Need help?'}
          </p>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            {t('errors.contactSupport') || 'Contact Support'}
          </Link>
        </div>
      </div>
    </div>
  );
}

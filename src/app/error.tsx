'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Purpose: Global error boundary page
 * Note: This catches all unhandled errors at the app level
 * Params:
 *   - error: Error — The error object
 *   - reset: () => void — Function to retry the error boundary
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  
  // Extract language from pathname
  const langMatch = pathname?.match(/^\/([a-z]{2})\//);
  const lang = langMatch ? langMatch[1] : 'vi';

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by error boundary:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-muted/10 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-destructive/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">
            {lang === 'vi' ? 'Đã Có Lỗi Xảy Ra' : 'Something Went Wrong'}
          </CardTitle>
          <CardDescription>
            {lang === 'vi'
              ? 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn.'
              : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              className="flex-1"
              onClick={reset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {lang === 'vi' ? 'Thử Lại' : 'Try Again'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              asChild
            >
              <Link href={`/${lang}/dashboard`}>
                <Home className="mr-2 h-4 w-4" />
                {lang === 'vi' ? 'Về Trang Chủ' : 'Go Home'}
              </Link>
            </Button>
          </div>
          
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              {lang === 'vi' ? 'Cần trợ giúp?' : 'Need help?'}
            </p>
            <Link 
              href={`/${lang}/dashboard`}
              className="text-sm text-primary hover:underline"
            >
              {lang === 'vi' ? 'Liên hệ hỗ trợ' : 'Contact Support'}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

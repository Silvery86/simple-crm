'use client';

import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

/**
 * Purpose: 404 Not Found error page
 * Returns: React.ReactNode — 404 error UI with navigation options
 */
export default function NotFound() {
  const { t } = useLang();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50"></div>
            <AlertCircle className="h-24 w-24 text-red-600 relative" />
          </div>
        </div>

        {/* Error Code */}
        <div>
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground mt-2">
            {t('errors.pageNotFound') || 'Page Not Found'}
          </p>
        </div>

        {/* Error Description */}
        <p className="text-muted-foreground">
          {t('errors.pageNotFoundDesc') ||
            "The page you're looking for doesn't exist or has been moved."}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back') || 'Go Back'}
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

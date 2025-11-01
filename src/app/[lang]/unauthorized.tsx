'use client';

import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Home, ArrowLeft } from 'lucide-react';

/**
 * Purpose: 403 Unauthorized access page
 * Shown when user doesn't have permission for a resource
 * Returns: React.ReactNode — Unauthorized error UI
 */
export default function Unauthorized() {
  const { t } = useLang();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50"></div>
            <Lock className="h-24 w-24 text-orange-600 relative" />
          </div>
        </div>

        {/* Error Code */}
        <div>
          <h1 className="text-6xl font-bold text-foreground">403</h1>
          <p className="text-lg text-muted-foreground mt-2">
            {t('errors.unauthorized') || 'Access Denied'}
          </p>
        </div>

        {/* Error Description */}
        <p className="text-muted-foreground">
          {t('errors.unauthorizedDesc') ||
            "You don't have permission to access this resource. Please contact an administrator if you believe this is a mistake."}
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

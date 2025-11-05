'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Purpose: Unauthorized access page (403 Forbidden)
 * Note: Shown when user tries to access a resource without proper permissions
 */
export default function UnauthorizedPage() {
  const pathname = usePathname();
  
  // Extract language from pathname
  const langMatch = pathname?.match(/^\/([a-z]{2})\//);
  const lang = langMatch ? langMatch[1] : 'vi';

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-muted/10 to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-amber-500/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl text-amber-600 dark:text-amber-500">
            {lang === 'vi' ? 'Truy Cập Bị Từ Chối' : 'Access Denied'}
          </CardTitle>
          <CardDescription>
            {lang === 'vi'
              ? 'Bạn không có quyền truy cập tài nguyên này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.'
              : "You don't have permission to access this resource. Please contact an administrator if you believe this is a mistake."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>{lang === 'vi' ? 'Lưu ý:' : 'Note:'}</strong>{' '}
              {lang === 'vi'
                ? 'Trang này yêu cầu quyền truy cập đặc biệt. Nếu bạn cần truy cập, hãy yêu cầu quản trị viên cấp quyền cho tài khoản của bạn.'
                : 'This page requires special access permissions. If you need access, please request the administrator to grant permissions to your account.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              className="flex-1"
              asChild
            >
              <Link href={`/${lang}/dashboard`}>
                <Home className="mr-2 h-4 w-4" />
                {lang === 'vi' ? 'Về Trang Chủ' : 'Go Home'}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {lang === 'vi' ? 'Quay Lại' : 'Go Back'}
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

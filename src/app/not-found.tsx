'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Purpose: Global 404 Not Found page
 * Note: This catches all unmatched routes at the app level
 */
export default function NotFound() {
  const pathname = usePathname();
  
  // Extract language from pathname
  const langMatch = pathname?.match(/^\/([a-z]{2})\//);
  const lang = langMatch ? langMatch[1] : 'vi';

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-muted/10 to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-destructive">404</span>
          </div>
          <CardTitle className="text-2xl">
            {lang === 'vi' ? 'Không Tìm Thấy Trang' : 'Page Not Found'}
          </CardTitle>
          <CardDescription>
            {lang === 'vi' 
              ? 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.'
              : "The page you're looking for doesn't exist or has been moved."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

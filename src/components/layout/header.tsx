'use client';

import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/hooks/useLang';
import { useAuth } from '@/lib/auth/auth-context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '@/components/ui/button';
import { Bell, Search, HelpCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * Purpose: Get page title based on current route.
 * Params:
 *   - pathname: string — Current URL pathname.
 *   - t: (key: string) => string — Translation function.
 * Returns:
 *   - string — Page title for display.
 */
const getPageTitle = (pathname: string | null, t: (key: string) => string): string => {
  if (!pathname) return t('sidebar.dashboard');

  const routeMap: Record<string, string> = {
    '/orders': t('sidebar.orders'),
    '/customers': t('sidebar.customers'),
    '/stores': t('sidebar.stores'),
    '/analytics': t('sidebar.analytics'),
    '/settings': t('sidebar.settings'),
  };

  for (const [route, title] of Object.entries(routeMap)) {
    if (pathname.includes(route)) return title;
  }

  return t('sidebar.dashboard');
};

/**
 * Purpose: Top header/navbar component with breadcrumb and user actions.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Header component with search, notifications, and settings.
 */
export function Header() {
  const pathname = usePathname();
  const { t } = useLang();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const pageTitle = getPageTitle(pathname, t);

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        {/* Page Title / Breadcrumb */}
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {t('common.welcome')}, {user?.name || user?.email}
          </p>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search...'}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </button>

          {/* Help */}
          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="md:hidden px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search...'}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </header>
  );
}

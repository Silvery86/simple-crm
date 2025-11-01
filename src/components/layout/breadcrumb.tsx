'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/hooks/useLang';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Purpose: Breadcrumb item with label and href.
 * Params: N/A (Type definition only)
 * Returns: N/A
 */
interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

/**
 * Purpose: Get breadcrumb items from current pathname.
 * Params:
 *   - pathname: string — Current URL pathname.
 *   - lang: string — Current language code.
 *   - t: (key: string) => string — Translation function.
 * Returns:
 *   - BreadcrumbItem[] — Array of breadcrumb items for current route.
 */
const getBreadcrumbs = (
  pathname: string | null,
  lang: string,
  t: (key: string) => string
): BreadcrumbItem[] => {
  if (!pathname) {
    return [{ label: t('sidebar.dashboard'), href: `/${lang}/dashboard`, current: true }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: t('sidebar.dashboard'),
      href: `/${lang}/dashboard`,
    },
  ];

  const routeLabels: Record<string, string> = {
    orders: t('sidebar.orders'),
    customers: t('sidebar.customers'),
    stores: t('sidebar.stores'),
    analytics: t('sidebar.analytics'),
    settings: t('sidebar.settings'),
  };

  let path = '';
  for (const segment of segments) {
    if (segment === lang) continue;
    if (segment === 'dashboard') continue;

    path += `/${segment}`;
    const label = routeLabels[segment] || segment;

    breadcrumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      href: `/${lang}/dashboard${path}`,
    });
  }

  if (breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1].current = true;
  }

  return breadcrumbs;
};

/**
 * Purpose: Breadcrumb navigation component showing current page location.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Breadcrumb navigation trail.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const { lang, t } = useLang();

  const breadcrumbs = getBreadcrumbs(pathname, lang, t);

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link href={`/${lang}/dashboard`} className="flex items-center gap-2 hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">{t('sidebar.dashboard')}</span>
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.current ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

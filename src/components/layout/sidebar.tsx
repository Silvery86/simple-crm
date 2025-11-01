'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useLang } from '@/lib/hooks/useLang';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Store,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

/**
 * Purpose: Navigation menu item configuration for dashboard sidebar.
 * Params: N/A (Type definition only)
 * Returns: N/A
 */
interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  roles?: string[];
}

/**
 * Purpose: Main navigation sidebar component with collapsible menu for dashboard.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Sidebar navigation component with role-based menu items.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /**
   * Purpose: Handle user logout action.
   * Params: N/A
   * Returns:
   *   - Promise<void> — Completes logout and redirects to login page.
   */
  const handleLogout = async () => {
    await logout();
    window.location.href = `/${lang}/auth/login`;
  };

  /**
   * Purpose: Get active status for navigation item based on current route.
   * Params:
   *   - href: string — Target route path.
   * Returns:
   *   - boolean — True if route is currently active.
   */
  const isActive = (href: string): boolean => {
    return pathname?.startsWith(href) ?? false;
  };

  /**
   * Purpose: Navigation menu items with role-based access control.
   * Params: N/A
   * Returns:
   *   - SidebarItem[] — Array of menu items filtered by user role.
   */
  const menuItems: SidebarItem[] = [
    {
      label: t('sidebar.dashboard'),
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: `/${lang}/dashboard`,
    },
    {
      label: t('sidebar.orders'),
      icon: <ShoppingCart className="h-5 w-5" />,
      href: `/${lang}/dashboard/orders`,
    },
    {
      label: t('sidebar.customers'),
      icon: <Users className="h-5 w-5" />,
      href: `/${lang}/dashboard/customers`,
    },
    {
      label: t('sidebar.stores'),
      icon: <Store className="h-5 w-5" />,
      href: `/${lang}/dashboard/stores`,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      label: t('sidebar.analytics'),
      icon: <BarChart3 className="h-5 w-5" />,
      href: `/${lang}/dashboard/analytics`,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      label: t('sidebar.settings'),
      icon: <Settings className="h-5 w-5" />,
      href: `/${lang}/dashboard/settings`,
      roles: ['ADMIN'],
    },
  ];

  /**
   * Purpose: Filter menu items based on user role.
   * Params: N/A
   * Returns:
   *   - SidebarItem[] — Filtered menu items for current user.
   */
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => user?.roles?.includes(role));
  });

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-background border border-border hover:bg-muted"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40 flex flex-col',
          isOpen ? 'w-64' : 'w-20',
          'md:relative md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {isOpen && (
            <h1 className="text-xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              CRM
            </h1>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden md:flex p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleMenuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {item.icon}
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4 space-y-2">
          {isOpen && (
            <div className="text-xs text-muted-foreground truncate px-4">
              <p className="font-medium text-foreground truncate">{user?.name || user?.email}</p>
              <p className="text-xs">{user?.roles?.[0] || 'USER'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              'text-foreground hover:bg-destructive/10 hover:text-destructive'
            )}
          >
            <LogOut className="h-5 w-5" />
            {isOpen && <span className="text-sm font-medium">{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className={cn('hidden md:block transition-all duration-300', isOpen ? 'w-64' : 'w-20')} />
    </>
  );
}

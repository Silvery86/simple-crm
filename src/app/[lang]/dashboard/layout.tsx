'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { GlobalLoaderProvider } from '@/components/ui/global-loader';

/**
 * Purpose: Dashboard layout wrapper with sidebar and header navigation.
 * Params:
 *   - children: React.ReactNode — Page content to render inside dashboard layout.
 * Returns:
 *   - React.ReactNode — Complete dashboard layout with sidebar, header, and breadcrumb.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalLoaderProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Header */}
          <Header />

          {/* Page Content with Breadcrumb */}
          <main className="flex-1 p-6">
            <Breadcrumb />
            {children}
          </main>
        </div>
      </div>
    </GlobalLoaderProvider>
  );
}

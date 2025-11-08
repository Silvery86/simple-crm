import { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Store } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';

interface StorePageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.page.stores.title} | ${dict.meta.title}`,
    description: dict.page.stores.subtitle,
  };
}

async function getStores() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stores`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    return [];
  }
}

export default async function StoresPage({ params }: StorePageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const stores = await getStores();

  const totalStores = stores.length;
  const activeStores = stores.filter((s: any) => s.isActive).length;
  const wooStores = stores.filter((s: any) => s.platform === 'WOO').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {dict.page.stores.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            {dict.page.stores.subtitle}
          </p>
        </div>
        <Link
          href={`/${lang}/dashboard/stores/new`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          {dict.page.stores.actions.add}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              {dict.page.stores.stats.total}
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalStores}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="text-sm font-medium text-muted-foreground">
              {dict.page.stores.stats.active}
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold">{activeStores}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛒</span>
            <p className="text-sm font-medium text-muted-foreground">
              {dict.page.stores.stats.woo}
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold">{wooStores}</p>
        </div>
      </div>

      {/* Store List */}
      {stores.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Store className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            {dict.page.stores.empty.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {dict.page.stores.empty.description}
          </p>
          <Link
            href={`/${lang}/dashboard/stores/new`}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {dict.page.stores.actions.add}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: any) => (
            <div
              key={store.id}
              className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              {/* Store Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{store.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {store.platform}
                    </p>
                  </div>
                </div>
                <div
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    store.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {store.isActive
                    ? dict.page.stores.status.active
                    : dict.page.stores.status.inactive}
                </div>
              </div>

              {/* Store Info */}
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  🌐 {store.domain}
                </p>
                {store.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {store.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {store.country && <span>📍 {store.country}</span>}
                  {store.currency && <span>💰 {store.currency}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/${lang}/dashboard/stores/${store.id}`}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-center text-sm font-medium hover:bg-accent"
                >
                  {dict.page.stores.actions.view}
                </Link>
                <Link
                  href={`/${lang}/dashboard/stores/${store.id}/edit`}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-center text-sm font-medium hover:bg-accent"
                >
                  {dict.page.stores.actions.edit}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

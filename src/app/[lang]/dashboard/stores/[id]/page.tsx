import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';
import DeleteStoreButton from '@/components/stores/delete-store-button';

interface StoreDetailPageProps {
  params: Promise<{ lang: string; id: string }>;
}

export async function generateMetadata({
  params,
}: StoreDetailPageProps): Promise<Metadata> {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.page.stores.title} | ${dict.meta.title}`,
  };
}

async function getStore(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/stores/${id}`,
      {
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch store:', error);
    return null;
  }
}

export default async function StoreDetailPage({
  params,
}: StoreDetailPageProps) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const store = await getStore(id);

  if (!store) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${lang}/dashboard/stores`}
            className="rounded-md p-2 hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
            <p className="text-muted-foreground mt-1">
              {store.platform} • {store.domain}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/${lang}/dashboard/stores/${id}/edit`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Edit className="mr-2 h-4 w-4" />
            {dict.page.stores.actions.edit}
          </Link>
          <DeleteStoreButton storeId={id} storeName={store.name} />
        </div>
      </div>

      {/* Store Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {dict.page.stores.form.name}
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.stores.form.name}
              </p>
              <p className="font-medium">{store.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.stores.form.platform}
              </p>
              <p className="font-medium">{store.platform}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.stores.form.domain}
              </p>
              <div className="flex items-center gap-2">
                <p className="font-medium">{store.domain}</p>
                <a
                  href={`https://${store.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.common.status}
              </p>
              <div
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
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
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          <div className="space-y-4">
            {store.description && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.page.stores.form.description}
                </p>
                <p className="font-medium">{store.description}</p>
              </div>
            )}
            {store.country && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.page.stores.form.country}
                </p>
                <p className="font-medium">{store.country}</p>
              </div>
            )}
            {store.currency && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.page.stores.form.currency}
                </p>
                <p className="font-medium">{store.currency}</p>
              </div>
            )}
            {store.logo && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Logo</p>
                <img
                  src={store.logo}
                  alt={store.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* API Credentials */}
        {store.platform === 'WOO' && (
          <div className="rounded-lg border bg-card p-6 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">WooCommerce API</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.page.stores.form.consumerKey}
                </p>
                <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
                  {store.consumerKey || 'Not configured'}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {dict.page.stores.form.consumerSecret}
                </p>
                <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
                  ••••••••••••••••
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Secret is hidden for security
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="rounded-lg border bg-card p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Timestamps</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {new Date(store.createdAt).toLocaleString(lang)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated At</p>
              <p className="font-medium">
                {new Date(store.updatedAt).toLocaleString(lang)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

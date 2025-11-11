import { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';

interface ProductPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.page.products.title} | ${dict.meta.title}`,
    description: dict.page.products.subtitle,
  };
}

async function getProducts() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/products?isShared=false`,
      {
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}

export default async function ProductsPage({ params }: ProductPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const products = await getProducts();

  const totalProducts = products.length;
  const totalVariants = products.reduce(
    (sum: number, p: any) => sum + (p.variants?.length || 0),
    0
  );
  const totalStores = products.reduce(
    (sum: number, p: any) => sum + (p._count?.maps || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {dict.page.products.title}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Store Products Only
            </span>
          </div>
          <p className="text-muted-foreground mt-2">
            {dict.page.products.subtitle} (Excluding shared catalog products)
          </p>
        </div>
        <Link
          href={`/${lang}/dashboard/products/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {dict.page.products.actions.add}
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.products.stats.total}
              </p>
              <p className="text-2xl font-bold">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.products.stats.variants}
              </p>
              <p className="text-2xl font-bold">{totalVariants}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-500/10 p-3">
              <Package className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dict.page.products.stats.stores}
              </p>
              <p className="text-2xl font-bold">{totalStores}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{dict.page.products.filterAll}</h2>
            <input
              type="text"
              placeholder={dict.page.products.searchPlaceholder}
              className="px-4 py-2 border rounded-md w-64"
            />
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {dict.page.products.empty.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {dict.page.products.empty.description}
              </p>
              <Link
                href={`/${lang}/dashboard/products/new`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {dict.page.products.actions.add}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Brand</th>
                    <th className="text-left p-4 font-medium">Variants</th>
                    <th className="text-left p-4 font-medium">Stores</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{product.title}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {product.brand ? (
                          <span className="text-sm">{product.brand.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{product.variants?.length || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{product._count?.maps || 0}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${lang}/dashboard/products/${product.id}`}
                            className="px-3 py-1 text-sm border rounded-md hover:bg-muted"
                          >
                            {dict.page.products.actions.view}
                          </Link>
                          <Link
                            href={`/${lang}/dashboard/products/${product.id}/edit`}
                            className="px-3 py-1 text-sm border rounded-md hover:bg-muted"
                          >
                            {dict.page.products.actions.edit}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

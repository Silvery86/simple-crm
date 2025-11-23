import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/locales/server';
import PriceComparisonDashboard from '@/components/products/price-comparison-dashboard';

interface PricePageProps {
  params: Promise<{ lang: string; productId: string }>;
}

export async function generateMetadata({
  params,
}: PricePageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `Price Comparison | ${dict.meta.title}`,
    description: 'Compare and manage product prices across all stores',
  };
}

/**
 * Purpose: Fetch product details with prices
 * Params:
 *   - productId: string - Product ID
 * Returns:
 *   - Promise<any> - Product data or null
 */
async function getProductWithPrices(productId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/products/${productId}/prices`,
      {
        cache: 'no-store',
      }
    );
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch product prices');
    }
    
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch product prices:', error);
    return null;
  }
}

export default async function ProductPricesPage({ params }: PricePageProps) {
  const { lang, productId } = await params;
  const dict = await getDictionary(lang);
  
  const productData = await getProductWithPrices(productId);
  
  if (!productData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Price Comparison
          </h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Compare and manage prices across all stores for: <strong>{productData.product.title}</strong>
        </p>
      </div>

      {/* Price Comparison Dashboard */}
      <PriceComparisonDashboard
        productId={productId}
        productData={productData}
        lang={lang}
      />
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';
import StoreForm from '@/components/stores/store-form';

interface EditStorePageProps {
  params: Promise<{ lang: string; id: string }>;
}

export async function generateMetadata({
  params,
}: EditStorePageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.page.stores.form.editTitle} | ${dict.meta.title}`,
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

export default async function EditStorePage({
  params,
}: EditStorePageProps) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);
  const store = await getStore(id);

  if (!store) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${lang}/dashboard/stores/${id}`}
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {dict.page.stores.form.editTitle}
          </h1>
          <p className="text-muted-foreground mt-2">{store.name}</p>
        </div>
      </div>

      {/* Form */}
      <StoreForm mode="edit" initialData={store} />
    </div>
  );
}

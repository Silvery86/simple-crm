import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';
import StoreForm from '@/components/stores/store-form';
import { getStoreByIdAction } from '@/lib/actions/store.actions';

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

export default async function EditStorePage({
  params,
}: EditStorePageProps) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);

  const result = await getStoreByIdAction(id);
  if (!result.success || !result.data) {
    notFound();
  }
  const store = result.data;

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

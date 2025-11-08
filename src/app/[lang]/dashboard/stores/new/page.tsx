import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDictionary } from '@/lib/locales/server';
import StoreForm from '@/components/stores/store-form';

interface CreateStorePageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: CreateStorePageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: `${dict.page.stores.form.createTitle} | ${dict.meta.title}`,
  };
}

export default async function CreateStorePage({
  params,
}: CreateStorePageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${lang}/dashboard/stores`}
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {dict.page.stores.form.createTitle}
          </h1>
          <p className="text-muted-foreground mt-2">
            {dict.page.stores.form.requiredFields}
          </p>
        </div>
      </div>

      {/* Form */}
      <StoreForm mode="create" />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/hooks/useLang';
import { useToast } from '@/components/ui/toast';
import { useGlobalLoader } from '@/components/ui/global-loader';
import { storeFormSchema, type StoreFormData } from '@/lib/zod/store.schema';
import { z } from 'zod';

interface StoreFormProps {
  initialData?: {
    id?: string;
    name: string;
    platform: string;
    domain: string;
    isActive: boolean;
    description?: string;
    logo?: string;
    country?: string;
    currency: string;
    consumerKey?: string;
    consumerSecret?: string;
  };
  mode: 'create' | 'edit';
}

export default function StoreForm({ initialData, mode }: StoreFormProps) {
  const router = useRouter();
  const { t, lang } = useLang();
  const { success: showSuccess, error: showError } = useToast();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    platform: initialData?.platform || 'WOO',
    domain: initialData?.domain || '',
    isActive: initialData?.isActive ?? true,
    description: initialData?.description || '',
    logo: initialData?.logo || '',
    country: initialData?.country || '',
    currency: initialData?.currency || 'USD',
    consumerKey: initialData?.consumerKey || '',
    consumerSecret: initialData?.consumerSecret || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation with Zod
    const validation = storeFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      showError('validation.failed', 'validation.checkFields', 5000);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Show loader with appropriate message
      if (formData.platform === 'WOO' && formData.consumerKey && formData.consumerSecret && formData.consumerSecret !== '****************') {
        showLoader(t('page.stores.loader.validating'));
      } else {
        showLoader(mode === 'create' ? t('page.stores.loader.creating') : t('page.stores.loader.updating'));
      }

      const url =
        mode === 'create'
          ? '/api/stores'
          : `/api/stores/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      // Prepare data - exclude consumerSecret if it's the placeholder
      const submitData = {
        ...formData,
        consumerSecret: formData.consumerSecret === '****************' 
          ? undefined 
          : formData.consumerSecret,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      hideLoader();

      if (!data.success) {
        // Check if it's a connection error
        if (data.meta?.connectionStatus === 'failed') {
          showError(
            t('toast.error.connectionFailed'),
            data.meta?.message || t('page.stores.error.cannotConnect'),
            10000
          );
        } else {
          showError('toast.error.saveFailed', data.error?.message || 'Failed to save store', 5000);
        }
        return;
      }

      // Check connection status
      if (data.meta?.connectionStatus === 'failed') {
        showError(
          t('toast.error.connectionFailed'),
          data.meta?.message || t('page.stores.error.cannotConnect'),
          10000
        );
        return;
      }

      // Success
      showSuccess(
        'toast.success.saved',
        mode === 'create' 
          ? t('page.stores.success.created')
          : t('page.stores.success.updated'),
        3000
      );

      // Redirect to stores list
      setTimeout(() => {
        router.push(`/${lang}/dashboard/stores`);
        router.refresh();
      }, 500);
    } catch (err: any) {
      hideLoader();
      showError('toast.error.unknownError', err.message || 'An error occurred', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Realtime validation on blur
  const handleBlur = (field: keyof StoreFormData) => {
    try {
      const fieldSchema = storeFormSchema.shape[field];
      if (fieldSchema) {
        fieldSchema.parse(formData[field]);
        // Clear error if validation passes
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [field]: err.issues[0].message,
        }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive p-4 text-sm text-destructive">
          <p className="font-medium mb-2">Please fix the following errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          {t('page.stores.form.createTitle')}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Store Name */}
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={() => handleBlur('name')}
              placeholder={t('page.stores.form.namePlaceholder')}
              required
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.name ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Platform */}
          <div>
            <label
              htmlFor="platform"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.platform')} *
            </label>
            <select
              id="platform"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="WOO">WooCommerce</option>
              <option value="SHOPIFY">Shopify</option>
            </select>
          </div>

          {/* Domain */}
          <div>
            <label
              htmlFor="domain"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.domain')} *
            </label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              onBlur={() => handleBlur('domain')}
              placeholder={t('page.stores.form.domainPlaceholder')}
              required
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.domain ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.domain && (
              <p className="text-xs text-destructive mt-1">{errors.domain}</p>
            )}
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.country')}
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder={t('page.stores.form.selectCountry')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Currency */}
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.currency')}
            </label>
            <input
              type="text"
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              placeholder="USD"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('page.stores.form.descriptionPlaceholder')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Logo URL */}
          <div className="md:col-span-2">
            <label
              htmlFor="logo"
              className="block text-sm font-medium mb-2"
            >
              {t('page.stores.form.logo')}
            </label>
            <input
              type="url"
              id="logo"
              name="logo"
              value={formData.logo}
              onChange={handleChange}
              placeholder={t('page.stores.form.logoPlaceholder')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Is Active */}
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              {t('page.stores.status.active')}
            </label>
          </div>
        </div>
      </div>

      {/* WooCommerce Credentials */}
      {formData.platform === 'WOO' && (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">WooCommerce API</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Consumer Key */}
            <div className="md:col-span-2">
              <label
                htmlFor="consumerKey"
                className="block text-sm font-medium mb-2"
              >
                {t('page.stores.form.consumerKey')}
              </label>
              <input
                type="text"
                id="consumerKey"
                name="consumerKey"
                value={formData.consumerKey}
                onChange={handleChange}
                placeholder={t('page.stores.form.consumerKeyPlaceholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Consumer Secret */}
            <div className="md:col-span-2">
              <label
                htmlFor="consumerSecret"
                className="block text-sm font-medium mb-2"
              >
                {t('page.stores.form.consumerSecret')}
              </label>
              <input
                type="password"
                id="consumerSecret"
                name="consumerSecret"
                value={formData.consumerSecret}
                onChange={handleChange}
                placeholder={
                  mode === 'edit' 
                    ? 'Enter new secret to update (or leave as is)'
                    : t('page.stores.form.consumerSecretPlaceholder')
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'edit'
                  ? ''
                  : 'Required for WooCommerce integration'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {t('page.stores.form.cancelButton')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {loading
            ? t('page.stores.form.saving')
            : t('page.stores.form.saveButton')}
        </button>
      </div>
    </form>
  );
}

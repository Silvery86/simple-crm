'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { useLang } from '@/lib/hooks/useLang';

interface DeleteStoreButtonProps {
  storeId: string;
  storeName: string;
}

export default function DeleteStoreButton({
  storeId,
  storeName,
}: DeleteStoreButtonProps) {
  const router = useRouter();
  const { t, lang } = useLang();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/${lang}/dashboard/stores`);
        router.refresh();
      } else {
        alert(data.error?.message || 'Failed to delete store');
      }
    } catch (error) {
      alert('An error occurred while deleting the store');
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center justify-center rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {t('page.stores.actions.delete')}
      </button>

      {/* Delete Confirmation Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {t('page.stores.delete.title')}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              {t('page.stores.delete.message')}
            </p>

            <div className="rounded-lg bg-muted p-3 mb-6">
              <p className="text-sm font-medium">{storeName}</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                disabled={loading}
                className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {t('page.stores.delete.cancelButton')}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : t('page.stores.delete.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

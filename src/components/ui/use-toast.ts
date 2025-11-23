import { useToast as useToastContext } from '@/components/ui/toast';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

/**
 * Purpose: Hook for showing toast notifications with plain text
 * Note: This is a wrapper around the existing toast system
 * Returns:
 *   - toast function and dismiss function
 */
export function useToast() {
  const toastContext = useToastContext();

  const toast = ({ title, description, variant, duration }: ToastOptions) => {
    // Convert to the existing toast format
    // Use the text directly (will be detected as non-translation-key by isTranslationKey check)
    const type = variant === 'destructive' ? 'error' : 'success';
    
    // Pass plain text - the toast component will detect it's not a translation key
    // and display it as-is
    toastContext.addToast({
      type,
      titleKey: title,
      messageKey: description || '',
      duration,
      autoClose: true,
    });
  };

  return {
    toast,
    dismiss: (id: string) => toastContext.removeToast(id),
  };
}

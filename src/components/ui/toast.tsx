'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  titleKey: string;
  messageKey: string;
  duration?: number;
  autoClose?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (titleKey: string, messageKey: string, duration?: number) => void;
  error: (titleKey: string, messageKey: string, duration?: number) => void;
  warning: (titleKey: string, messageKey: string, duration?: number) => void;
  info: (titleKey: string, messageKey: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Purpose: Provider component to manage toast notifications globally.
 * Usage:
 *   - Wrap at app root level with language context
 *   - Use useToast() hook in child components
 * Features:
 *   - Auto-dismiss with configurable duration
 *   - Bilingual support via translation keys
 *   - Toast type: success, error, warning, info
 * Params:
 *   - children: ReactNode — Child components.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Purpose: Remove toast notification by ID.
   * Params:
   *   - id: string — Unique toast identifier.
   * Returns:
   *   - void
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * Purpose: Add new toast notification to queue.
   * Params:
   *   - toast: Toast — Toast configuration without ID.
   * Returns:
   *   - void — Toast is added and auto-dismisses based on duration.
   */
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    if (toast.autoClose !== false) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, [removeToast]);

  /**
   * Purpose: Create and show success toast notification.
   * Params:
   *   - titleKey: string — Translation key for title.
   *   - messageKey: string — Translation key for message.
   *   - duration?: number — Auto-dismiss time in ms (default: 5000).
   * Returns:
   *   - void
   */
  const success = useCallback((titleKey: string, messageKey: string, duration?: number) => {
    addToast({ type: 'success', titleKey, messageKey, duration });
  }, [addToast]);

  /**
   * Purpose: Create and show error toast notification.
   * Params:
   *   - titleKey: string — Translation key for title.
   *   - messageKey: string — Translation key for message.
   *   - duration?: number — Auto-dismiss time in ms (default: 5000).
   * Returns:
   *   - void
   */
  const error = useCallback((titleKey: string, messageKey: string, duration?: number) => {
    addToast({ type: 'error', titleKey, messageKey, duration });
  }, [addToast]);

  /**
   * Purpose: Create and show warning toast notification.
   * Params:
   *   - titleKey: string — Translation key for title.
   *   - messageKey: string — Translation key for message.
   *   - duration?: number — Auto-dismiss time in ms (default: 5000).
   * Returns:
   *   - void
   */
  const warning = useCallback((titleKey: string, messageKey: string, duration?: number) => {
    addToast({ type: 'warning', titleKey, messageKey, duration });
  }, [addToast]);

  /**
   * Purpose: Create and show info toast notification.
   * Params:
   *   - titleKey: string — Translation key for title.
   *   - messageKey: string — Translation key for message.
   *   - duration?: number — Auto-dismiss time in ms (default: 5000).
   * Returns:
   *   - void
   */
  const info = useCallback((titleKey: string, messageKey: string, duration?: number) => {
    addToast({ type: 'info', titleKey, messageKey, duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

/**
 * Purpose: Hook to access toast notification functions.
 * Returns:
 *   - ToastContextType — Functions: success, error, warning, info to create toasts.
 * Throws:
 *   - Error — When used outside ToastProvider.
 * Usage:
 *   - const toast = useToast();
 *   - toast.success('title.key', 'message.key');
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Purpose: Container component to render all active toast notifications.
 * Position:
 *   - Fixed at top-center of viewport
 *   - z-index: 50 to stay above other content
 * Returns:
 *   - JSX.Element — Renders toast queue.
 */
function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md pointer-events-none">
      <div className="flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}

/**
 * Purpose: Individual toast item component with icon and close button.
 * Params:
 *   - toast: Toast — Toast data including type, titles, messages.
 * Returns:
 *   - JSX.Element — Styled toast notification.
 */
function isTranslationKey(value: string): boolean {
  // Translation keys follow the pattern: word.word.word (dot notation)
  // Check if it looks like a translation key
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value) && value.includes('.');
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const { t, lang } = useLang();

  // Debug logging
  useEffect(() => {
    const titleResult = isTranslationKey(toast.titleKey) ? t(toast.titleKey) : toast.titleKey;
    const messageResult = isTranslationKey(toast.messageKey) ? t(toast.messageKey) : toast.messageKey;
    
    console.log('[Toast Debug]', {
      lang,
      titleKey: toast.titleKey,
      titleIsKey: isTranslationKey(toast.titleKey),
      titleResult,
      messageKey: toast.messageKey,
      messageIsKey: isTranslationKey(toast.messageKey),
      messageResult,
    });
  }, [toast, t, lang]);

  /**
   * Purpose: Get appropriate icon based on toast type.
   * Returns:
   *   - ReactNode — Colored icon matching toast type.
   */
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return null;
    }
  };

  /**
   * Purpose: Get background and border CSS classes based on toast type.
   * Returns:
   *   - string — Tailwind classes for styling.
   */
  const getBackgroundClass = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600';
      case 'error':
        return 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-600';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-600';
      case 'info':
        return 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div
      className={`
        pointer-events-auto rounded-lg border p-4 shadow-lg backdrop-blur-sm
        animate-slide-in-from-top transition-all duration-300
        ${getBackgroundClass()}
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">
            {isTranslationKey(toast.titleKey) ? t(toast.titleKey) : toast.titleKey}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {isTranslationKey(toast.messageKey) ? t(toast.messageKey) : toast.messageKey}
          </p>
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
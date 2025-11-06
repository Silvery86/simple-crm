'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalLoaderContextType {
  isLoading: boolean;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  message: string;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(undefined);

/**
 * Purpose: Hook to access global loader functions.
 * Returns:
 *   - GlobalLoaderContextType — Contains isLoading state and show/hide functions.
 * Throws:
 *   - Error — When used outside GlobalLoaderProvider.
 */
export function useGlobalLoader(): GlobalLoaderContextType {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error('useGlobalLoader must be used within GlobalLoaderProvider');
  }
  return context;
}

/**
 * Purpose: Provider component for global loading state management.
 * Params:
 *   - children: ReactNode — Child components to wrap.
 * Returns:
 *   - React.ReactNode — Provider with loading context.
 */
export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Purpose: Show global loader with optional custom message.
   * Params:
   *   - message?: string — Optional loading message.
   * Returns:
   *   - void
   */
  const showLoader = (msg?: string) => {
    setMessage(msg || 'Loading...');
    setIsLoading(true);
  };

  /**
   * Purpose: Hide global loader.
   * Params: N/A
   * Returns:
   *   - void
   */
  const hideLoader = () => {
    setIsLoading(false);
  };

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, showLoader, hideLoader, message }}>
      {children}
      {isMounted && isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4 rounded-lg bg-background p-8 shadow-2xl border border-border">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">{message}</p>
          </div>
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
}

'use client';

import { LanguageProvider, extractLangFromPath } from '@/lib/hooks/useLang';
import { ToastProvider } from '@/components/ui/toast';
import { usePathname } from 'next/navigation';
import { ReactNode, use } from 'react';

type Language = 'vi' | 'en';

interface LanguageLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

/**
 * Purpose: Layout component to provide language context for [lang] routes.
 */
export default function LanguageLayout({ children, params }: LanguageLayoutProps) {
  const pathname = usePathname();
  const currentLang = extractLangFromPath(pathname);
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang as Language) || currentLang;

  return (
    <LanguageProvider initialLang={lang}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </LanguageProvider>
  );
}
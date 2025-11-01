'use client';

import { LanguageProvider, extractLangFromPath } from '@/lib/hooks/useLang';
import { ToastProvider } from '@/components/ui/toast';
import { usePathname } from 'next/navigation';
import { ReactNode, use } from 'react';

type Language = 'vi' | 'en';

interface LanguageLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: Language }>;
}

/**
 * Purpose: Layout component to provide language context for [lang] routes.
 */
export default function LanguageLayout({ children, params }: LanguageLayoutProps) {
  const pathname = usePathname();
  const currentLang = extractLangFromPath(pathname);
  const resolvedParams = use(params);

  return (
    <LanguageProvider initialLang={resolvedParams.lang || currentLang}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </LanguageProvider>
  );
}
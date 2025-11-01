'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Language = 'vi' | 'en';

interface Translations {
  [key: string]: any;
}

interface LanguageContextType {
  lang: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Purpose: Language provider component to manage translations and language state.
 */
export function LanguageProvider({ 
  children, 
  initialLang = 'vi' 
}: { 
  children: ReactNode;
  initialLang?: Language;
}) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Purpose: Load translations for a specific language with caching.
   * Params:
   *   - language: Language — Language code to load ('vi' or 'en').
   * Returns:
   *   - Promise<void> — Resolves when translations are loaded.
   */
  const loadTranslations = async (language: Language) => {
    try {
      setIsLoading(true);
      
      const cacheKey = `translations_${language}`;
      const cachedTranslations = localStorage.getItem(cacheKey);
      
      if (cachedTranslations) {
        setTranslations(JSON.parse(cachedTranslations));
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/locales/${language}`);
      if (response.ok) {
        const data = await response.json();
        setTranslations(data);
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } else {
        console.error('Failed to load translations for:', language);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Purpose: Get translated text by key using dot notation.
   * Params:
   *   - key: string — Translation key path (e.g., 'page.login.title', 'common.loading').
   * Returns:
   *   - string — Translated text or the key itself if translation not found.
   */
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  /**
   * Purpose: Change application language and update URL path.
   * Params:
   *   - newLang: Language — New language to set ('vi' or 'en').
   * Returns:
   *   - void — Triggers language change and URL update.
   */
  const setLanguage = (newLang: Language) => {
    setLang(newLang);
    loadTranslations(newLang);

    const pathWithoutLang = pathname.replace(/^\/[a-z]{2}/, '') || '/';
    const newPath = `/${newLang}${pathWithoutLang}`;
    router.push(newPath);
  };

  /**
   * Purpose: Load translations on component mount and language change.
   */
  useEffect(() => {
    loadTranslations(lang);
  }, [lang]);

  const value: LanguageContextType = {
    lang,
    t,
    setLanguage,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Purpose: Hook to access language context and translation functions.
 * Returns:
 *   - LanguageContextType — Contains lang, t function, setLanguage, isLoading.
 * Throws:
 *   - Error — When used outside LanguageProvider.
 */
export function useLang(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Purpose: Extract language code from pathname.
 * Params:
 *   - pathname: string — Current page pathname.
 * Returns:
 *   - Language — Extracted language code ('vi' or 'en'), defaults to 'vi'.
 */
export function extractLangFromPath(pathname: string): Language {
  const langMatch = pathname.match(/^\/([a-z]{2})/);
  const lang = langMatch ? langMatch[1] as Language : 'vi';
  return ['vi', 'en'].includes(lang) ? lang : 'vi';
}
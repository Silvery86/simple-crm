/**
 * Purpose: Server-side translation utilities for Next.js server components.
 * This file provides functions to load and access translations in server components.
 */

import enTranslations from './en.json';
import viTranslations from './vi.json';

type Language = 'vi' | 'en';
type Translations = typeof enTranslations;

const translations: Record<Language, Translations> = {
  en: enTranslations,
  vi: viTranslations,
};

/**
 * Purpose: Get translations dictionary for a specific language.
 * Params:
 *   - lang: string — Language code ('vi' or 'en').
 * Returns:
 *   - Translations — Translation dictionary object.
 */
export async function getDictionary(lang: string): Promise<Translations> {
  const language = (lang === 'en' ? 'en' : 'vi') as Language;
  return translations[language];
}

/**
 * Purpose: Get a specific translation value by key path.
 * Params:
 *   - lang: string — Language code ('vi' or 'en').
 *   - key: string — Dot-notation path to translation (e.g., 'page.stores.title').
 * Returns:
 *   - string — Translated text or the key if not found.
 */
export async function getTranslation(lang: string, key: string): Promise<string> {
  const dict = await getDictionary(lang);
  const keys = key.split('.');
  let value: any = dict;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if not found
    }
  }
  
  return typeof value === 'string' ? value : key;
}

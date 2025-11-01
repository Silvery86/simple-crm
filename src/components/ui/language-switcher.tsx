'use client';

import { useLang } from '@/lib/hooks/useLang';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Purpose: Language switcher component with dropdown menu.
 */
export function LanguageSwitcher() {
  const { lang, setLanguage, t } = useLang();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Globe className="h-4 w-4 mr-2" />
          {lang === 'vi' ? 'VI' : 'EN'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLanguage('vi')}
          className={lang === 'vi' ? 'bg-accent' : ''}
        >
          🇻🇳 {t('common.vietnamese')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={lang === 'en' ? 'bg-accent' : ''}
        >
          🇺🇸 {t('common.english')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { Language } from '@/lib/i18n';

export function LanguageSwitcher({ supported = ['en', 'am'] }: { supported?: Language[] }) {
  const { language, setLanguage, t } = useLanguage();
  const languages = supported.includes(language) ? supported : [...supported, language];

  return (
    <label className="inline-flex min-h-11 items-center gap-2 text-sm">
      <Languages aria-hidden="true" className="hidden size-4 shrink-0 min-[360px]:block" />
      <span className="sr-only">{t('language')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="min-h-11 w-[6.5rem] rounded border border-current bg-transparent px-2 py-1 text-sm font-semibold sm:w-[7.5rem]"
        aria-label={t('language')}
      >
        {languages.map((option) => (
          <option key={option} value={option} className="text-text-dark">
            {option === 'en' ? t('english') : t('amharic')}
          </option>
        ))}
      </select>
    </label>
  );
}

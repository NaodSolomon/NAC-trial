'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  defaultLanguage,
  languageCookieName,
  localizedHref,
  normalizeLanguage,
  translate,
  type Language,
  type MessageKey,
} from '.';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  href: (href: string) => string;
  t: (key: MessageKey) => string;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage = defaultLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const router = useRouter();
  const queryLanguage = normalizeLanguage(searchParameters.get('lang'));
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(initialLanguage);
  const language = queryLanguage ?? selectedLanguage;

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(languageCookieName, language);
  }, [language]);

  useEffect(() => {
    if (window.localStorage.getItem('nac-high-contrast') === 'true') {
      document.documentElement.dataset.contrast = 'more';
    }
  }, []);

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      setSelectedLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
      document.cookie = `${languageCookieName}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.localStorage.setItem(languageCookieName, nextLanguage);

      const nextParameters = new URLSearchParams(searchParameters.toString());
      nextParameters.set('lang', nextLanguage);
      router.replace(`${pathname}?${nextParameters.toString()}`, { scroll: false });
    },
    [pathname, router, searchParameters],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      href: (href) => localizedHref(href, language),
      t: (key) => translate(language, key),
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const supportedLanguages = ['en', 'am'] as const;

export type Language = (typeof supportedLanguages)[number];

export const languageCookieName = 'nac-language';
export const documentLanguageHeaderName = 'x-nac-document-language';
export const defaultLanguage: Language = 'en';

export function normalizeLanguage(value: string | null | undefined): Language | undefined {
  return supportedLanguages.find((language) => language === value);
}

export function resolveDocumentLanguage(
  pathname: string,
  queryLanguage: string | null | undefined,
  persistedLanguage: string | null | undefined,
): Language {
  if (isEnglishOnlyRoute(pathname)) return defaultLanguage;
  return normalizeLanguage(queryLanguage) ?? normalizeLanguage(persistedLanguage) ?? defaultLanguage;
}

function isEnglishOnlyRoute(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/login' ||
    pathname === '/dashboard' ||
    pathname === '/coming-soon'
  );
}

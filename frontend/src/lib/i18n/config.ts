export const supportedLanguages = ['en', 'am'] as const;

export type Language = (typeof supportedLanguages)[number];

export const languageCookieName = 'nac-language';
export const defaultLanguage: Language = 'en';

export function normalizeLanguage(value: string | null | undefined): Language | undefined {
  return supportedLanguages.find((language) => language === value);
}

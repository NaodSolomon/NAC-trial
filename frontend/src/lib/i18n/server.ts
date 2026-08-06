import 'server-only';

import { cookies } from 'next/headers';
import { languageCookieName, normalizeLanguage, type Language } from '.';

export async function resolveRequestLanguage(queryLanguage?: string): Promise<Language> {
  const fromQuery = normalizeLanguage(queryLanguage);
  if (fromQuery) return fromQuery;
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get(languageCookieName)?.value) ?? 'en';
}

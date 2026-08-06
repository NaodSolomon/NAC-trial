import type { Language } from '@/lib/i18n';

export type SearchResultType = 'page' | 'event' | 'blog';

export interface PublicSearchResult {
  type: SearchResultType;
  slug: string;
  title: string;
  summary: string | null;
  languageCode: Language;
  date: string | null;
  url: string;
}

export interface PublicSearchResponse {
  query: string;
  results: PublicSearchResult[];
}

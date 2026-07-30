export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export type SearchResultType = 'page' | 'event' | 'blog';

export interface SearchRecord {
  type: SearchResultType;
  slug: string;
  title: string;
  summary: string | null;
  languageCode: 'en' | 'am';
  date: Date | null;
}

export interface SearchCriteria {
  term: string;
  languageCode?: 'en' | 'am';
}

export interface SearchRepository {
  search(criteria: SearchCriteria): Promise<SearchRecord[]>;
}

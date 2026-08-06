import { sanitizeCmsText } from '@/features/cms/sanitize-cms';
import type { Language } from '@/lib/i18n';
import type { PublicSearchResult } from './search.types';

export function validateSearchTerm(value: string | undefined) {
  if (value === undefined) return { kind: 'missing' as const, term: '' };
  const term = value.trim();
  if (term.length < 2 || term.length > 100) return { kind: 'invalid' as const, term };
  return { kind: 'valid' as const, term };
}

export function safeSearchExcerpt(value: string | null, maxLength = 220): string {
  const safe = sanitizeCmsText(value ?? '');
  if (safe.length <= maxLength) return safe;
  return safe.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
}

export function searchResultHref(result: PublicSearchResult, language: Language): string {
  const base =
    result.type === 'page'
      ? result.slug === 'home'
        ? '/'
        : '/' + result.slug
      : result.type === 'event'
        ? '/events/' + result.slug
        : '/blog/' + result.slug;
  const separator = base.includes('?') ? '&' : '?';
  return base + separator + 'lang=' + language;
}

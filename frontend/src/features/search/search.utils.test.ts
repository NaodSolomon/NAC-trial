import { describe, expect, it } from 'vitest';
import { safeSearchExcerpt, searchResultHref, validateSearchTerm } from './search.utils';

describe('public search presentation', () => {
  it('removes markup and blocked element contents from excerpts', () => {
    expect(safeSearchExcerpt('<p>Family support</p><script>private()</script>')).toBe(
      'Family support',
    );
  });

  it('derives a local route instead of trusting the API URL field', () => {
    expect(
      searchResultHref(
        {
          type: 'blog',
          slug: 'family-support',
          title: 'Family support',
          summary: null,
          languageCode: 'en',
          date: null,
          url: 'https://malicious.example/redirect',
        },
        'am',
      ),
    ).toBe('/blog/family-support?lang=am');

    expect(
      searchResultHref(
        {
          type: 'page',
          slug: 'services',
          title: 'Services',
          summary: null,
          languageCode: 'en',
          date: null,
          url: '/pages/services',
        },
        'en',
      ),
    ).toBe('/services?lang=en');
  });

  it('distinguishes missing, invalid, and valid URL queries', () => {
    expect(validateSearchTerm(undefined).kind).toBe('missing');
    expect(validateSearchTerm(' x ').kind).toBe('invalid');
    expect(validateSearchTerm(' family support ').kind).toBe('valid');
  });
});

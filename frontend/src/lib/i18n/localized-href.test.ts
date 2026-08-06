import { describe, expect, it } from 'vitest';
import { localizedHref } from './localized-href';

describe('localizedHref', () => {
  it('adds the selected language to internal routes', () => {
    expect(localizedHref('/events', 'am')).toBe('/events?lang=am');
  });

  it('preserves query parameters and fragments', () => {
    expect(localizedHref('/search?q=autism#results', 'en')).toBe(
      '/search?q=autism&lang=en#results',
    );
  });

  it('replaces an existing language without changing external links', () => {
    expect(localizedHref('/about?lang=en', 'am')).toBe('/about?lang=am');
    expect(localizedHref('https://example.org/help', 'am')).toBe('https://example.org/help');
    expect(localizedHref('#main-content', 'am')).toBe('#main-content');
  });
});

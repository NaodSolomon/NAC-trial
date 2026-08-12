import { describe, expect, it } from 'vitest';
import { resolveDocumentLanguage } from './config';

describe('server document language', () => {
  it('prefers a supported public URL language over the cookie', () => {
    expect(resolveDocumentLanguage('/about', 'am', 'en')).toBe('am');
  });

  it('uses the persisted language when a public URL has no valid language', () => {
    expect(resolveDocumentLanguage('/events', undefined, 'am')).toBe('am');
    expect(resolveDocumentLanguage('/events', 'unsupported', 'am')).toBe('am');
  });

  it('defaults public requests and administrator routes to English', () => {
    expect(resolveDocumentLanguage('/faq', undefined, undefined)).toBe('en');
    expect(resolveDocumentLanguage('/admin', 'am', 'am')).toBe('en');
    expect(resolveDocumentLanguage('/admin/content', 'am', 'am')).toBe('en');
    expect(resolveDocumentLanguage('/coming-soon', 'am', 'am')).toBe('en');
  });
});

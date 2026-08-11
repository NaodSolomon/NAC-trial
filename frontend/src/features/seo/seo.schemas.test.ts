import { describe, expect, it } from 'vitest';
import { isApprovedSeoImageUrl, normalizeSeoKeywords, seoEditorSchema } from './seo.schemas';

describe('SEO administration validation', () => {
  it('matches backend title, description, keyword, and image limits', () => {
    expect(seoEditorSchema.safeParse({ languageCode: 'en', title: 't'.repeat(70), description: 'd'.repeat(160), keywordsText: Array.from({ length: 10 }, (_, index) => `keyword-${index}`).join(','), imageUrl: 'https://media.example.org/image.jpg' }).success).toBe(true);
    expect(seoEditorSchema.safeParse({ languageCode: 'en', title: 't'.repeat(71), description: 'Description', keywordsText: '', imageUrl: '' }).success).toBe(false);
    expect(seoEditorSchema.safeParse({ languageCode: 'en', title: 'Title', description: 'd'.repeat(161), keywordsText: '', imageUrl: '' }).success).toBe(false);
    expect(seoEditorSchema.safeParse({ languageCode: 'en', title: 'Title', description: 'Description', keywordsText: Array.from({ length: 11 }, (_, index) => `keyword-${index}`).join(','), imageUrl: '' }).success).toBe(false);
  });

  it('normalizes duplicate keywords like the backend', () => {
    expect(normalizeSeoKeywords(' Autism, ethiopia, AUTISM, support ')).toEqual([
      'autism',
      'ethiopia',
      'support',
    ]);
  });

  it('allows HTTPS and configured local MinIO but rejects insecure remote images', () => {
    expect(isApprovedSeoImageUrl('https://cdn.example.org/social.jpg')).toBe(true);
    expect(isApprovedSeoImageUrl('http://remote.example.org/social.jpg')).toBe(false);
    expect(isApprovedSeoImageUrl('http://localhost:9000/nehemiah-media/social.jpg')).toBe(true);
  });
});

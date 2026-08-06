import { describe, expect, it } from 'vitest';
import { blogPageSchema, publishedBlogPostSchema } from './blog.schemas';

const publishedPost = {
  id: '00000000-0000-4000-8000-000000000301',
  slug: 'family-support',
  languageCode: 'en',
  title: 'Family support',
  excerpt: 'Practical guidance for families.',
  content: 'Published article content.',
  status: 'PUBLISHED',
  seoTitle: null,
  seoDescription: null,
  seoImageUrl: null,
  publishedAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

describe('published blog contract', () => {
  it('parses a paginated published response', () => {
    const result = blogPageSchema.parse({
      data: [publishedPost],
      meta: { total: 1, page: 1, limit: 6, totalPages: 1 },
    });

    expect(result.data[0]?.status).toBe('PUBLISHED');
    expect(result.data[0]?.publishedAt).toBe('2026-08-01T09:00:00.000Z');
  });

  it('rejects draft posts even if a public API regresses', () => {
    expect(() => publishedBlogPostSchema.parse({ ...publishedPost, status: 'DRAFT' })).toThrow();
  });
});

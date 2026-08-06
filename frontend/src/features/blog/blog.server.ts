import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { blogPageSchema, publishedBlogPostSchema } from './blog.schemas';

const client = createServerApiClient();
export const blogPageSize = 6;

export async function loadPublishedBlogs(language: Language, page: number) {
  const value = await client.get<unknown>(
    '/public/blog?languageCode=' + language + '&page=' + page + '&limit=' + blogPageSize,
    blogCache(120, ['blog:' + language]),
  );
  return blogPageSchema.parse(value);
}

export async function loadPublishedBlog(slug: string, language: Language) {
  const value = await client.get<unknown>(
    '/public/blog/' + encodeURIComponent(slug) + '?languageCode=' + language,
    blogCache(300, ['blog:' + language + ':' + slug]),
  );
  return publishedBlogPostSchema.parse(value);
}

export function parseBlogPage(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  return Math.min(Number(value), 10_000);
}

function blogCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

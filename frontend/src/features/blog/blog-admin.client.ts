import { browserApiClient } from '@/lib/api/browser-client';
import {
  adminBlogListSchema,
  adminBlogPostSchema,
  type BlogEditorValues,
} from './blog-admin.schemas';

export async function listAdminBlog(criteria: {
  page: number;
  languageCode?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({ page: String(criteria.page), limit: '12' });
  if (criteria.languageCode) query.set('languageCode', criteria.languageCode);
  return adminBlogListSchema.parse(
    await browserApiClient.get(`/admin/blog?${query}`, { signal: criteria.signal }),
  );
}
function payload(values: BlogEditorValues, includeLanguage: boolean) {
  return {
    slug: values.slug,
    ...(includeLanguage && { languageCode: values.languageCode }),
    title: values.title,
    excerpt: values.excerpt,
    content: values.content,
    seoTitle: values.seoTitle || undefined,
    seoDescription: values.seoDescription || undefined,
    seoImageUrl: values.seoImageUrl || undefined,
  };
}
export async function createBlog(values: BlogEditorValues) {
  return adminBlogPostSchema.parse(
    await browserApiClient.post('/admin/blog', payload(values, true)),
  );
}
export async function updateBlog(id: string, values: BlogEditorValues) {
  return adminBlogPostSchema.parse(
    await browserApiClient.patch(
      `/admin/blog/${encodeURIComponent(id)}`,
      payload(values, false),
    ),
  );
}
export async function publishBlog(id: string) {
  return adminBlogPostSchema.parse(
    await browserApiClient.post(`/admin/blog/${encodeURIComponent(id)}/publish`),
  );
}
export function deleteBlog(id: string) {
  return browserApiClient.delete(`/admin/blog/${encodeURIComponent(id)}`);
}

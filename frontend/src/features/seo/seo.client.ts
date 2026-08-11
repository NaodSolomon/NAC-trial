import { browserApiClient } from '@/lib/api/browser-client';
import { seoResponseSchema, normalizeSeoKeywords, type SeoEditorValues } from './seo.schemas';

export async function updateSeoMetadata(slug: string, values: SeoEditorValues) {
  return seoResponseSchema.parse(
    await browserApiClient.patch<unknown>(`/admin/seo/${encodeURIComponent(slug)}`, {
      languageCode: values.languageCode,
      title: values.title || null,
      description: values.description || null,
      keywords: normalizeSeoKeywords(values.keywordsText),
      imageUrl: values.imageUrl || null,
    }),
  );
}

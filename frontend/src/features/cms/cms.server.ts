import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { faqCompositionSchema, publishedCmsPageSchema } from './cms.schemas';

const client = createServerApiClient();

export async function loadPublishedPage(slug: string, language: Language) {
  const value = await client.get(
    `/public/pages/${encodeURIComponent(slug)}?languageCode=${language}`,
    contentCache(120, [`cms:${slug}:${language}`]),
  );
  return publishedCmsPageSchema.parse(value);
}

export async function loadFaqs(language: Language) {
  const value = await client.get(
    `/public/content/faqs?languageCode=${language}`,
    contentCache(120, [`cms:faq:${language}`]),
  );
  return faqCompositionSchema.parse(value);
}

function contentCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

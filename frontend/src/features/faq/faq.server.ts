import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { faqCategoriesSchema, faqCollectionSchema } from './faq.schemas';

const client = createServerApiClient();

function faqCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

export async function loadFaqs(language: Language, category?: string) {
  const query = new URLSearchParams({ languageCode: language });
  if (category) query.set('category', category);

  const value = await client.get(
    `/public/faqs?${query.toString()}`,
    faqCache(120, [`faq:${language}`]),
  );
  return faqCollectionSchema.parse(value);
}

export async function loadFaqCategories(language: Language) {
  const value = await client.get(
    `/public/faqs/categories?languageCode=${language}`,
    faqCache(120, [`faq:${language}`]),
  );
  return faqCategoriesSchema.parse(value);
}

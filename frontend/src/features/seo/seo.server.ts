import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import { isApiRequestError } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { seoResponseSchema } from './seo.schemas';

const client = createServerApiClient();

export async function loadPublicSeo(slug: string, language: Language) {
  try {
    const value = await client.get<unknown>(
      `/public/seo/${encodeURIComponent(slug)}?languageCode=${language}`,
      process.env.NODE_ENV === 'development'
        ? { cache: 'no-store' }
        : { next: { revalidate: 300, tags: [`seo:${slug}:${language}`] } },
    );
    return seoResponseSchema.parse(value);
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') return null;
    throw error;
  }
}

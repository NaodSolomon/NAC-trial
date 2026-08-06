import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { publicResourceListSchema } from './resource.schemas';

const client = createServerApiClient();

export async function loadPublicResources(language: Language) {
  const options =
    process.env.NODE_ENV === 'development'
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 120, tags: [`resources:${language}`] } };
  const value = await client.get<unknown>(
    `/public/resources?languageCode=${language}&page=1&limit=100`,
    options,
  );
  return publicResourceListSchema.parse(value).data;
}

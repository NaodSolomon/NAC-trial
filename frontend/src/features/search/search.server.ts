import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { publicSearchSchema } from './search.schemas';

const client = createServerApiClient();

export async function loadPublicSearch(term: string, language: Language) {
  const value = await client.get<unknown>(
    '/public/search?q=' + encodeURIComponent(term) + '&languageCode=' + language,
    { cache: 'no-store' },
  );
  return publicSearchSchema.parse(value);
}

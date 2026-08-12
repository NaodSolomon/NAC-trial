import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { publicEventPageSchema, publicEventSchema } from './event.schemas';
import type { EventTimeframe } from './event.types';

const client = createServerApiClient();

export async function loadPublicEvents(language: Language, timeframe: EventTimeframe) {
  const sortOrder = timeframe === 'past' ? 'desc' : 'asc';
  const value = await client.get(
    `/public/events?languageCode=${language}&timeframe=${timeframe}&sortOrder=${sortOrder}&page=1&limit=100`,
    eventCache(120, [`events:${language}:${timeframe}`]),
  );
  return publicEventPageSchema.parse(value);
}

export async function loadPublicEvent(slug: string, language: Language) {
  const value = await client.get(
    `/public/events/${encodeURIComponent(slug)}?languageCode=${language}`,
    eventCache(300, [`events:${language}:${slug}`]),
  );
  return publicEventSchema.parse(value);
}

export async function loadAllPublishedEvents(language: Language) {
  const value = await client.get(
    `/public/events?languageCode=${language}&timeframe=all&sortOrder=desc&page=1&limit=100`,
    eventCache(600, [`sitemap:events:${language}`]),
  );
  return publicEventPageSchema.parse(value).data;
}

function eventCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

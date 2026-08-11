import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import {
  publicContactPageSchema,
  publicTestimonialsSchema,
  publicVolunteerPageSchema,
} from './engagement.schemas';

const client = createServerApiClient();

export async function loadPublicContact(language: Language) {
  const value = await client.get<unknown>(
    `/public/contact?languageCode=${language}`,
    engagementCache(120, [`contact:${language}`]),
  );
  return publicContactPageSchema.parse(value);
}

export async function loadPublicVolunteer(language: Language) {
  const value = await client.get<unknown>(
    `/public/volunteer?languageCode=${language}`,
    engagementCache(120, [`volunteer:${language}`]),
  );
  return publicVolunteerPageSchema.parse(value);
}

export async function loadPublishedTestimonials(language: Language) {
  const value = await client.get<unknown>(
    `/public/testimonials?languageCode=${language}&page=1&limit=6&sortOrder=desc`,
    engagementCache(120, [`testimonials:${language}`]),
  );
  return publicTestimonialsSchema.parse(value).data;
}

function engagementCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import {
  blogListSchema,
  eventListSchema,
  galleryListSchema,
  homeCompositionSchema,
} from './home.schemas';
import type { HomePageData } from './home.types';

const client = createServerApiClient();

export const resolveHomeLanguage = resolveRequestLanguage;

export async function loadHomePageData(language: Language): Promise<HomePageData> {
  const compositionRequest = loadComposition(language);
  const teaserRequests = Promise.allSettled([
    loadBlogPosts(language),
    loadEvents(language),
    loadGallery(language),
  ]);
  const [composition, teasers] = await Promise.all([compositionRequest, teaserRequests]);

  return {
    language,
    composition,
    blogPosts: teasers[0].status === 'fulfilled' ? teasers[0].value : null,
    events: teasers[1].status === 'fulfilled' ? teasers[1].value : null,
    galleryItems: teasers[2].status === 'fulfilled' ? teasers[2].value : null,
  };
}

export async function loadComposition(language: Language) {
  const value = await client.get(`/public/content/homepage?languageCode=${language}`, {
    ...homeCache(120, [`homepage:${language}`]),
  });
  return homeCompositionSchema.parse(value);
}

async function loadBlogPosts(language: Language) {
  const value = await client.get(`/public/blog?languageCode=${language}&page=1&limit=3`, {
    ...homeCache(120, [`blog:${language}`]),
  });
  return blogListSchema.parse(value).data.map((post, index) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: post.seoImageUrl || `/images/blog_${(index % 3) + 1}.jpg`,
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
  }));
}

async function loadEvents(language: Language) {
  const value = await client.get(
    `/public/events?languageCode=${language}&timeframe=upcoming&sortOrder=asc&page=1&limit=3`,
    homeCache(60, [`events:${language}`]),
  );
  return eventListSchema.parse(value).data.map((event, index) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    startDate: new Date(event.startDate).toISOString(),
    location: event.location,
    imageUrl: `/images/event_${(index % 3) + 1}.jpg`,
  }));
}

async function loadGallery(language: Language) {
  const value = await client.get(
    `/public/gallery?languageCode=${language}&type=IMAGE&sortOrder=desc&page=1&limit=8`,
    homeCache(120, [`gallery:${language}`]),
  );
  return galleryListSchema.parse(value).data;
}

function homeCache(revalidate: number, tags: string[]) {
  // Development content should update immediately; production retains bounded server caching.
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

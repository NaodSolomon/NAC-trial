import 'server-only';

import { cache } from 'react';
import { z } from 'zod';
import { createServerApiClient } from '@/lib/api/server-client';

const publicSettingsSchema = z.object({
  siteName: z.string(),
  defaultLanguage: z.enum(['en', 'am']),
  supportedLanguages: z.array(z.enum(['en', 'am'])),
  contactEmail: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  socialLinks: z.record(z.string(), z.string()).default({}),
  defaultShareImageUrl: z.string().nullable().default(null),
  pageBanners: z
    .object({ gallery: z.string(), blog: z.string(), events: z.string() })
    .partial()
    .default({}),
  localizedText: z
    .object({
      openingHours: z.object({ en: z.string(), am: z.string() }).partial().optional(),
      tagline: z.object({ en: z.string(), am: z.string() }).partial().optional(),
      footerAbout: z.object({ en: z.string(), am: z.string() }).partial().optional(),
      faqIntro: z.object({ en: z.string(), am: z.string() }).partial().optional(),
    })
    .default({}),
});

export type ServerPublicSettings = z.infer<typeof publicSettingsSchema>;

const client = createServerApiClient();

// React cache dedupes within a request; the fetch cache bounds staleness across
// requests. A failure returns null so every consumer falls back rather than crashes.
export const loadPublicSettings = cache(async (): Promise<ServerPublicSettings | null> => {
  try {
    const options =
      process.env.NODE_ENV === 'development'
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 300, tags: ['settings'] } };
    return publicSettingsSchema.parse(await client.get('/settings', options));
  } catch {
    return null;
  }
});

export function localizedSetting(
  settings: ServerPublicSettings | null,
  key: keyof ServerPublicSettings['localizedText'],
  language: 'en' | 'am',
): string | null {
  const value = settings?.localizedText[key];
  return value?.[language]?.trim() || value?.en?.trim() || null;
}

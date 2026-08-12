'use client';

import { useQuery } from '@tanstack/react-query';
import { browserApiClient } from '@/lib/api/browser-client';
import { queryKeys } from '@/lib/api/query-keys';
import { translate, type Language, type MessageKey } from '@/lib/i18n';
import { SITE_CONFIG } from '@/lib/constants';
import type {
  PublicNavigationItem,
  PublicSiteSettings,
} from '@/components/public/public-shell.types';

export function usePublicShellData(language: Language) {
  const fallbackNavigation = createFallbackNavigation(language);
  const fallbackSettings = createFallbackSettings();
  const navigation = useQuery({
    queryKey: [...queryKeys.navigation.public(), language],
    queryFn: async ({ signal }) => {
      const response = await browserApiClient.get(`/navigation?languageCode=${language}`, {
        signal,
      });
      return normalizeNavigation(response, fallbackNavigation);
    },
    placeholderData: fallbackNavigation,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const settings = useQuery({
    queryKey: queryKeys.settings.public(),
    queryFn: async ({ signal }) => {
      const response = await browserApiClient.get('/settings', { signal });
      return normalizeSettings(response, fallbackSettings);
    },
    placeholderData: fallbackSettings,
    staleTime: 5 * 60_000,
    retry: false,
  });

  return {
    navigation: navigation.data ?? fallbackNavigation,
    settings: settings.data ?? fallbackSettings,
    navigationUnavailable: navigation.isError,
    settingsUnavailable: settings.isError,
  };
}

function createFallbackNavigation(language: Language): PublicNavigationItem[] {
  const label = (key: MessageKey) => translate(language, key);
  return [
    { id: 'fallback-home', label: label('home'), url: '/' },
    {
      id: 'fallback-about',
      label: label('aboutUs'),
      url: '/about',
      children: [
        { id: 'fallback-about-page', label: label('aboutUs'), url: '/about' },
        { id: 'fallback-gallery', label: label('gallery'), url: '/gallery' },
        { id: 'fallback-volunteers', label: label('volunteers'), url: '/volunteer' },
        { id: 'fallback-faq', label: label('faq'), url: '/faq' },
      ],
    },
    { id: 'fallback-events', label: label('events'), url: '/events' },
    { id: 'fallback-blog', label: label('blog'), url: '/blog' },
    { id: 'fallback-contact', label: label('contact'), url: '/contact' },
  ];
}

function createFallbackSettings(): PublicSiteSettings {
  return {
    siteName: SITE_CONFIG.name,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'am'],
    contactEmail: SITE_CONFIG.email,
    phone: SITE_CONFIG.phone,
    address: SITE_CONFIG.address,
    socialLinks: {},
  };
}

function normalizeNavigation(
  value: unknown,
  fallback: PublicNavigationItem[],
): PublicNavigationItem[] {
  if (!Array.isArray(value)) return fallback;
  const navigation = value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.label !== 'string' || !isSafeNavigationUrl(candidate.url)) return [];
    return [
      {
        id: typeof candidate.id === 'string' ? candidate.id : `api-navigation-${index}`,
        label: candidate.label,
        url: candidate.url,
      },
    ];
  });
  return navigation.length > 0 ? navigation : fallback;
}

function normalizeSettings(value: unknown, fallback: PublicSiteSettings): PublicSiteSettings {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Record<string, unknown>;
  const supportedLanguages = Array.isArray(candidate.supportedLanguages)
    ? candidate.supportedLanguages.filter(
        (language): language is Language => language === 'en' || language === 'am',
      )
    : fallback.supportedLanguages;

  return {
    siteName: stringOrFallback(candidate.siteName, fallback.siteName),
    defaultLanguage:
      candidate.defaultLanguage === 'am' || candidate.defaultLanguage === 'en'
        ? candidate.defaultLanguage
        : fallback.defaultLanguage,
    supportedLanguages:
      supportedLanguages.length > 0
        ? [...new Set(supportedLanguages)]
        : fallback.supportedLanguages,
    contactEmail: nullableString(candidate.contactEmail, fallback.contactEmail),
    phone: nullableString(candidate.phone, fallback.phone),
    address: nullableString(candidate.address, fallback.address),
    socialLinks: normalizeSocialLinks(candidate.socialLinks),
  };
}

function normalizeSocialLinks(value: unknown): PublicSiteSettings['socialLinks'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  return Object.fromEntries(
    ['facebook', 'instagram', 'youtube', 'linkedin'].flatMap((network) => {
      const url = candidate[network];
      return typeof url === 'string' && /^https:\/\/\S+$/i.test(url) ? [[network, url]] : [];
    }),
  );
}

function isSafeNavigationUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !/^\/team(?:\/|$)/i.test(value) &&
    ((value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//i.test(value))
  );
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function nullableString(value: unknown, fallback: string | null) {
  if (value === null) return null;
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

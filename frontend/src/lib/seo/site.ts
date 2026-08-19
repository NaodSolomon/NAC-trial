import type { Metadata } from 'next';
import type { Language } from '@/lib/i18n';

export const siteName = 'Nehemiah Autism Center';
export const defaultDescription =
  'Nehemiah Autism Center supports autistic children and their families in Ethiopia.';

export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required in production');
  }

  try {
    const url = new URL(configured ?? 'http://localhost:3000');
    return new URL(url.origin);
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_SITE_URL must be a valid URL in production');
    }
    return new URL('http://localhost:3000');
  }
}

export function localizedUrl(pathname: string, language: Language): string {
  const url = new URL(pathname, getSiteUrl());
  url.search = '';
  url.searchParams.set('lang', language);
  return url.toString();
}

interface LocalizedMetadataInput {
  pathname: string;
  language: Language;
  title: string;
  description?: string | null;
  keywords?: string[];
  imageUrl?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  /** From site settings; the constants remain the fallback. */
  siteNameOverride?: string | null;
  defaultImageUrl?: string | null;
}

export function buildLocalizedMetadata(input: LocalizedMetadataInput): Metadata {
  const description = cleanDescription(input.description);
  const canonical = localizedUrl(input.pathname, input.language);
  const image = absoluteUrl(
    input.imageUrl ?? input.defaultImageUrl ?? '/images/home_1_slider_1.jpg',
  );
  return {
    title: input.title,
    description,
    keywords: input.keywords,
    openGraph: {
      type: input.type ?? 'website',
      locale: input.language === 'am' ? 'am_ET' : 'en_US',
      alternateLocale: input.language === 'am' ? ['en_US'] : ['am_ET'],
      url: canonical,
      siteName: input.siteNameOverride ?? siteName,
      title: input.title,
      description,
      images: [{ url: image, alt: input.title }],
      ...(input.type === 'article'
        ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      images: [image],
    },
  };
}

export function absoluteUrl(value: string): string {
  try {
    return new URL(value, getSiteUrl()).toString();
  } catch {
    return new URL('/images/home_1_slider_1.jpg', getSiteUrl()).toString();
  }
}

function cleanDescription(value?: string | null): string {
  const normalized = value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (normalized || defaultDescription).slice(0, 160);
}

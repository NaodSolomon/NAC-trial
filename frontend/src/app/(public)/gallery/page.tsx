import type { Metadata } from 'next';
import { GalleryPage } from '@/features/gallery';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { buildLocalizedMetadata } from '@/lib/seo/site';

type GalleryRouteProps = {
  searchParams: Promise<{ lang?: string; page?: string; type?: string; layout?: string }>;
};

export async function generateMetadata({ searchParams }: GalleryRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return buildLocalizedMetadata({
    pathname: '/gallery',
    language,
    title: language === 'am' ? 'ማዕከለ-ስዕላት' : 'Gallery',
    description:
      language === 'am'
        ? 'የነህምያ ኦቲዝም ማዕከል ፕሮግራሞች እና የማህበረሰብ እንቅስቃሴዎች ምስሎችና ቪዲዮዎች።'
        : 'Images and videos from Nehemiah Autism Center programs and community activities.',
  });
}

export default function Page({ searchParams }: GalleryRouteProps) {
  return <GalleryPage searchParams={searchParams} />;
}

import type { Metadata } from 'next';
import { HomePage, loadComposition, loadHomePageData, resolveHomeLanguage } from '@/features/home';

interface HomeRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: HomeRouteProps): Promise<Metadata> {
  const language = await resolveHomeLanguage((await searchParams).lang);
  const composition = await loadComposition(language);
  const description = composition.seo.description || composition.body.slice(0, 160);
  const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const canonical = new URL(`/?lang=${language}`, siteUrl);
  const image = new URL(composition.seo.imageUrl ?? '/images/home_1_slider_1.jpg', siteUrl);

  return {
    title: composition.seo.title,
    description,
    alternates: {
      canonical: canonical.toString(),
      languages: {
        en: new URL('/?lang=en', siteUrl).toString(),
        am: new URL('/?lang=am', siteUrl).toString(),
      },
    },
    openGraph: {
      type: 'website',
      locale: language === 'am' ? 'am_ET' : 'en_US',
      url: canonical.toString(),
      siteName: 'Nehemiah Autism Center',
      title: composition.seo.title,
      description,
      images: [{ url: image, alt: composition.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: composition.seo.title,
      description,
      images: [image],
    },
  };
}

export default async function Page({ searchParams }: HomeRouteProps) {
  const language = await resolveHomeLanguage((await searchParams).lang);
  const data = await loadHomePageData(language);
  return <HomePage data={data} />;
}

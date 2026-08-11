import type { Metadata } from 'next';
import { HomePage, loadComposition, loadHomePageData, resolveHomeLanguage } from '@/features/home';
import { loadPublicSeo } from '@/features/seo';
import { buildLocalizedMetadata } from '@/lib/seo/site';

interface HomeRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: HomeRouteProps): Promise<Metadata> {
  const language = await resolveHomeLanguage((await searchParams).lang);
  const [composition, seo] = await Promise.all([
    loadComposition(language),
    loadPublicSeo('homepage', language).catch(() => null),
  ]);
  return buildLocalizedMetadata({
    pathname: '/',
    language,
    title: seo?.title ?? composition.seo.title,
    description: seo?.description ?? composition.seo.description ?? composition.body,
    keywords: seo?.keywords,
    imageUrl: seo?.imageUrl ?? composition.seo.imageUrl,
  });
}

export default async function Page({ searchParams }: HomeRouteProps) {
  const language = await resolveHomeLanguage((await searchParams).lang);
  const data = await loadHomePageData(language);
  return <HomePage data={data} />;
}

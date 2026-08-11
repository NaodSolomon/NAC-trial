import type { Metadata } from 'next';
import { loadFaqs } from '@/features/cms';
import { FaqPage } from '@/features/faq';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { loadPublicSeo } from '@/features/seo';
import { buildLocalizedMetadata } from '@/lib/seo/site';

interface FaqRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: FaqRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const [content, seo] = await Promise.all([
    loadFaqs(language),
    loadPublicSeo('faqs', language).catch(() => null),
  ]);
  return buildLocalizedMetadata({
    pathname: '/faq',
    language,
    title: seo?.title ?? content.title,
    description: seo?.description ?? content.body,
    keywords: seo?.keywords,
    imageUrl: seo?.imageUrl,
  });
}

export default async function Page({ searchParams }: FaqRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return <FaqPage content={await loadFaqs(language)} language={language} />;
}

import type { Metadata } from 'next';
import { FaqPage } from '@/features/faq';
import { loadPublicSettings, localizedSetting } from '@/features/settings/public-settings.server';
import { loadFaqs } from '@/features/faq/faq.server';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { loadPublicSeo } from '@/features/seo';
import { buildLocalizedMetadata } from '@/lib/seo/site';

interface FaqRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

const fallbackTitle = { en: 'Frequently Asked Questions', am: 'ተደጋጋሚ ጥያቄዎች' } as const;
const fallbackDescription = {
  en: 'Answers about Nehemiah Autism Center, our services and how families can reach us.',
  am: 'ስለ ነህምያ ኦቲዝም ማዕከል፣ አገልግሎቶቻችንና ቤተሰቦች እንዴት እንደሚያገኙን መልሶች።',
} as const;

export async function generateMetadata({ searchParams }: FaqRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const seo = await loadPublicSeo('faqs', language).catch(() => null);

  return buildLocalizedMetadata({
    pathname: '/faq',
    language,
    title: seo?.title ?? fallbackTitle[language],
    description: seo?.description ?? fallbackDescription[language],
    keywords: seo?.keywords,
    imageUrl: seo?.imageUrl,
  });
}

export default async function Page({ searchParams }: FaqRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const [content, settings] = await Promise.all([loadFaqs(language), loadPublicSettings()]);
  return (
    <FaqPage
      content={content}
      language={language}
      intro={localizedSetting(settings, 'faqIntro', language)}
    />
  );
}

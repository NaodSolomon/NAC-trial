import type { Metadata } from 'next';
import { ContactPage } from '@/features/contact';
import { resolveRequestLanguage } from '@/lib/i18n/server';

import { buildLocalizedMetadata } from '@/lib/seo/site';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return buildLocalizedMetadata({
    pathname: '/contact',
    language,
    title: language === 'am' ? 'ያግኙን' : 'Contact us',
    description:
      language === 'am'
        ? 'የነህምያ ኦቲዝም ማዕከልን በአዲስ አበባ ያግኙ።'
        : 'Contact Nehemiah Autism Center in Addis Ababa for information and support.',
  });
}

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <ContactPage language={await resolveRequestLanguage(query.lang)} />;
}

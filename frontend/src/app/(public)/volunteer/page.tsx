import type { Metadata } from 'next';
import { VolunteerPage } from '@/features/engagement/components/VolunteerPage';
import { resolveRequestLanguage } from '@/lib/i18n/server';

import { localizedPageMetadata } from '@/lib/seo/site.server';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return localizedPageMetadata({
    pathname: '/volunteer',
    language,
    title: language === 'am' ? 'በፈቃደኝነት ያገልግሉ' : 'Volunteer',
    description:
      language === 'am'
        ? 'የነህምያ ኦቲዝም ማዕከልን በፈቃደኝነት ይደግፉ።'
        : 'Support autistic children and families by volunteering with Nehemiah Autism Center.',
  });
}

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  return <VolunteerPage language={await resolveRequestLanguage(query.lang)} />;
}

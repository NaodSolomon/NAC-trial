import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPublishedPage, teamMetadataSchema } from '@/features/cms';
import { loadPublicSeo } from '@/features/seo';
import { TeamPage } from '@/features/team';
import { isApiRequestError } from '@/lib/api/errors';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { buildLocalizedMetadata } from '@/lib/seo/site';

interface TeamRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: TeamRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const [page, seo] = await Promise.all([
    getApprovedTeamPage(language),
    loadPublicSeo('team', language).catch(() => null),
  ]);
  return buildLocalizedMetadata({
    pathname: '/team',
    language,
    title: seo?.title ?? page.seoTitle ?? page.title,
    description: seo?.description ?? page.seoDescription ?? page.content,
    keywords: seo?.keywords,
    imageUrl: seo?.imageUrl ?? page.seoImageUrl,
  });
}

export default async function Page({ searchParams }: TeamRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return <TeamPage page={await getApprovedTeamPage(language)} language={language} />;
}

async function getApprovedTeamPage(language: 'en' | 'am') {
  try {
    const page = await loadPublishedPage('team', language);
    if (!teamMetadataSchema.safeParse(page.metadata).success) notFound();
    return page;
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') notFound();
    throw error;
  }
}

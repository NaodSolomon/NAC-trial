import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AboutPage } from '@/features/about';
import { loadPublishedPage } from '@/features/cms';
import { isApiRequestError } from '@/lib/api/errors';
import { resolveRequestLanguage } from '@/lib/i18n/server';

interface AboutRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: AboutRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const page = await getAboutPage(language);
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.content.slice(0, 160),
  };
}

export default async function Page({ searchParams }: AboutRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return <AboutPage page={await getAboutPage(language)} language={language} />;
}

async function getAboutPage(language: 'en' | 'am') {
  try {
    return await loadPublishedPage('about', language);
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') notFound();
    throw error;
  }
}

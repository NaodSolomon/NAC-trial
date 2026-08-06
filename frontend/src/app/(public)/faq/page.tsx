import type { Metadata } from 'next';
import { loadFaqs } from '@/features/cms';
import { FaqPage } from '@/features/faq';
import { resolveRequestLanguage } from '@/lib/i18n/server';

interface FaqRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: FaqRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const content = await loadFaqs(language);
  return {
    title: `${content.title} | Nehemiah Autism Center`,
    description: content.body.slice(0, 160),
  };
}

export default async function Page({ searchParams }: FaqRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return <FaqPage content={await loadFaqs(language)} language={language} />;
}

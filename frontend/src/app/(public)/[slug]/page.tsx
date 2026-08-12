import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GenericCmsPage, loadPublishedPage } from '@/features/cms';
import { loadPublicSeo } from '@/features/seo';
import { isApiRequestError } from '@/lib/api/errors';
import { type Language } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';
import { buildLocalizedMetadata } from '@/lib/seo/site';

interface GenericCmsRouteProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

const cmsSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const withheldSlugs = new Set(['team']);

export async function generateMetadata({
  params,
  searchParams,
}: GenericCmsRouteProps): Promise<Metadata> {
  const slug = validatedSlug((await params).slug);
  const language = await resolveRequestLanguage((await searchParams).lang);
  const [page, seo] = await Promise.all([
    getPublishedCmsPage(slug, language),
    loadPublicSeo(slug, language).catch(() => null),
  ]);

  return buildLocalizedMetadata({
    pathname: `/${slug}`,
    language,
    title: seo?.title ?? page.seoTitle ?? page.title,
    description: seo?.description ?? page.seoDescription ?? page.content,
    keywords: seo?.keywords,
    imageUrl: seo?.imageUrl ?? page.seoImageUrl,
  });
}

export default async function GenericCmsRoute({ params, searchParams }: GenericCmsRouteProps) {
  const slug = validatedSlug((await params).slug);
  const language = await resolveRequestLanguage((await searchParams).lang);
  const page = await getPublishedCmsPage(slug, language);

  return <GenericCmsPage page={page} language={language} />;
}

function validatedSlug(value: string): string {
  if (!cmsSlugPattern.test(value) || value.length > 180 || withheldSlugs.has(value)) notFound();
  return value;
}

async function getPublishedCmsPage(slug: string, language: Language) {
  try {
    return await loadPublishedPage(slug, language);
  } catch (error) {
    if (isApiRequestError(error) && error.kind === 'NOT_FOUND') notFound();
    throw error;
  }
}

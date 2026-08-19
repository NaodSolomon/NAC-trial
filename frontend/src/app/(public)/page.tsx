import type { Metadata } from 'next';
import type { HomePageData } from '@/features/home';
import {
  HomePage,
  HomePreparing,
  loadComposition,
  loadHomePageData,
  resolveHomeLanguage,
} from '@/features/home';
import { loadPublicSeo } from '@/features/seo';
import { isApiRequestError } from '@/lib/api/errors';
import { buildLocalizedMetadata, defaultDescription, siteName } from '@/lib/seo/site';

interface HomeRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

// An unpublished homepage is a normal editorial state, not an outage: it renders a
// friendly placeholder. Every other failure still reaches the error boundary.
function isUnpublishedHomepage(error: unknown): boolean {
  return isApiRequestError(error) && error.status === 404;
}

export async function generateMetadata({ searchParams }: HomeRouteProps): Promise<Metadata> {
  const language = await resolveHomeLanguage((await searchParams).lang);
  try {
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
  } catch (error) {
    if (!isUnpublishedHomepage(error)) throw error;
    return buildLocalizedMetadata({
      pathname: '/',
      language,
      title: siteName,
      description: defaultDescription,
    });
  }
}

export default async function Page({ searchParams }: HomeRouteProps) {
  const language = await resolveHomeLanguage((await searchParams).lang);
  let data: HomePageData | null = null;
  try {
    data = await loadHomePageData(language);
  } catch (error) {
    if (!isUnpublishedHomepage(error)) throw error;
  }
  return data ? <HomePage data={data} /> : <HomePreparing language={language} />;
}

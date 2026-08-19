import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { ResourceExplorer, loadPublicResources } from '@/features/resources';
import { localizedHref, translate } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

import { localizedPageMetadata } from '@/lib/seo/site.server';

interface ResourcesRouteProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: ResourcesRouteProps): Promise<Metadata> {
  const language = await resolveRequestLanguage((await searchParams).lang);
  return localizedPageMetadata({
    pathname: '/resources',
    language,
    title: language === 'am' ? 'ግብዓቶች' : 'Resources',
    description:
      language === 'am'
        ? 'ለቤተሰቦች የታተሙ መረጃዎችን እና ግብዓቶችን ያውርዱ።'
        : 'Download published family information and resources from Nehemiah Autism Center.',
  });
}

export default async function Page({ searchParams }: ResourcesRouteProps) {
  const language = await resolveRequestLanguage((await searchParams).lang);
  const title = language === 'am' ? 'ግብዓቶች' : 'Resources';
  return (
    <>
      <PageBanner
        title={title}
        breadcrumbs={[
          {
            label: translate(language, 'home'),
            href: localizedHref('/', language),
          },
          { label: title },
        ]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <ResourceExplorer
            initialResources={await loadPublicResources(language)}
            language={language}
          />
        </div>
      </section>
    </>
  );
}

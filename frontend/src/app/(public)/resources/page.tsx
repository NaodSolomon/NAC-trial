import type { Metadata } from 'next';
import PageBanner from '@/components/common/PageBanner';
import { ResourceExplorer, loadPublicResources } from '@/features/resources';
import { localizedHref } from '@/lib/i18n';
import { resolveRequestLanguage } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Resources | Nehemiah Autism Center',
  description: 'Download published family information and resources from Nehemiah Autism Center.',
};

interface ResourcesRouteProps {
  searchParams: Promise<{ lang?: string }>;
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
            label: language === 'am' ? 'መነሻ' : 'Home',
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

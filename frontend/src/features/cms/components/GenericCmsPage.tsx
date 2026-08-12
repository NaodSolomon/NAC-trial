import PageBanner from '@/components/common/PageBanner';
import { localizedHref, type Language } from '@/lib/i18n';
import type { PublishedCmsPage } from '../cms.types';
import { CmsArticle } from './CmsArticle';

export function GenericCmsPage({
  page,
  language,
}: {
  page: PublishedCmsPage;
  language: Language;
}) {
  return (
    <>
      <PageBanner
        title={page.title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
          { label: page.title },
        ]}
        backgroundImage="/images/about-us.jpg"
      />
      <section className="bg-secondary-bg py-16 sm:py-20">
        <article className="bg-card mx-auto max-w-4xl rounded-xl border px-6 py-10 shadow-sm sm:px-10">
          <CmsArticle content={page.content} />
        </article>
      </section>
    </>
  );
}

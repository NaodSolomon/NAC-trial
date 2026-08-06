import Image from 'next/image';
import Link from 'next/link';
import PageBanner from '@/components/common/PageBanner';
import { CmsArticle, type PublishedCmsPage } from '@/features/cms';
import { localizedHref, type Language } from '@/lib/i18n';

export default function AboutPage({
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
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article>
            <h2 className="text-heading mb-6 text-3xl font-semibold sm:text-4xl">
              {language === 'am' ? 'ስለ ማዕከላችን' : 'About our center'}
            </h2>
            <CmsArticle content={page.content} />
            <Link
              href={localizedHref('/contact', language)}
              className="bg-primary hover:bg-primary-hover mt-8 inline-flex min-h-12 items-center rounded px-7 font-semibold text-white"
            >
              {language === 'am' ? 'ከቡድናችን ጋር ይነጋገሩ' : 'Talk with our team'}
            </Link>
          </article>
          <Image
            src="/images/volunteers.jpg"
            alt={language === 'am' ? 'የነህምያ ኦቲዝም ማዕከል ቡድን' : 'Nehemiah Autism Center community'}
            width={640}
            height={480}
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="aspect-[4/3] rounded-xl object-cover shadow-lg"
          />
        </div>
      </section>
    </>
  );
}

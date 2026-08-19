import Image from 'next/image';
import Link from 'next/link';
import PageBanner from '@/components/common/PageBanner';
import {
  aboutMetadataSchema,
  cmsBannerImage,
  CmsArticle,
  type PublishedCmsPage,
} from '@/features/cms';
import { localizedHref, translate, type Language } from '@/lib/i18n';

export default function AboutPage({
  page,
  language,
}: {
  page: PublishedCmsPage;
  language: Language;
}) {
  const composition = aboutMetadataSchema.safeParse(page.metadata);
  return (
    <>
      <PageBanner
        title={page.title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: page.title },
        ]}
        backgroundImage={cmsBannerImage(page.metadata) ?? '/images/about-us.jpg'}
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
      {composition.success && (
        <section className="bg-secondary-bg py-16 sm:py-20" aria-label={page.title}>
          <div className="mx-auto max-w-6xl space-y-12 px-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {[composition.data.about.mission, composition.data.about.history].map((section) => (
                <article key={section.heading} className="bg-card rounded-xl border p-7 shadow-sm">
                  <h2 className="text-heading font-serif text-3xl">{section.heading}</h2>
                  <p className="text-foreground mt-4 leading-7 whitespace-pre-line">
                    {section.body}
                  </p>
                </article>
              ))}
            </div>
            <section aria-labelledby="about-services-heading">
              <h2
                id="about-services-heading"
                className="text-heading text-center font-serif text-3xl"
              >
                {language === 'am' ? 'አገልግሎቶች' : 'Services overview'}
              </h2>
              <div className="mt-7 grid gap-5 md:grid-cols-3">
                {composition.data.about.services.map((service) => (
                  <article key={service.title} className="bg-card rounded-xl border p-6 shadow-sm">
                    <h3 className="text-heading text-xl font-semibold">{service.title}</h3>
                    <p className="text-foreground mt-3 leading-7">{service.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}
    </>
  );
}

import Image from 'next/image';
import PageBanner from '@/components/common/PageBanner';
import { CmsArticle } from '@/features/cms/components/CmsArticle';
import { localizedHref, type Language } from '@/lib/i18n';
import { loadPublishedTestimonials, loadPublicVolunteer } from '../engagement.server';
import { NewsletterSignup } from './NewsletterSignup';
import { PublishedTestimonials } from './PublishedTestimonials';
import { VolunteerForm } from './VolunteerForm';

export async function VolunteerPage({ language }: { language: Language }) {
  const content = await loadPublicVolunteer(language);
  const testimonials = await loadPublishedTestimonials(language).catch(() => []);
  return (
    <>
      <PageBanner
        title={content.title}
        breadcrumbs={[
          { label: language === 'am' ? 'መነሻ' : 'Home', href: localizedHref('/', language) },
          { label: content.title },
        ]}
        backgroundImage="/images/volunteers.jpg"
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-heading font-serif text-3xl">
              {language === 'am' ? 'ከእኛ ጋር በበጎ ፈቃድ ይስሩ' : 'Volunteer with us'}
            </h2>
            <div className="mt-5">
              <CmsArticle content={content.description} />
            </div>
            <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src="/images/volunteers.jpg"
                alt={
                  language === 'am'
                    ? 'በማዕከሉ የሚረዱ በጎ ፈቃደኞች'
                    : 'Volunteers supporting activities at the center'
                }
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
          <section
            aria-labelledby="volunteer-form-heading"
            className="bg-card rounded-xl border p-6 shadow-sm sm:p-8"
          >
            <h2 id="volunteer-form-heading" className="text-heading font-serif text-3xl">
              {language === 'am' ? 'ፍላጎትዎን ይግለጹ' : 'Register your interest'}
            </h2>
            <p className="text-foreground mt-3 mb-7">
              {language === 'am'
                ? 'መረጃዎን ይላኩ። ይህ ወዲያውኑ የበጎ ፈቃድ ቦታ እንደሚሰጥ አያረጋግጥም።'
                : 'Tell us how you would like to help. Submitting this form does not guarantee an immediate placement.'}
            </p>
            <VolunteerForm language={language} />
          </section>
        </div>
      </section>
      <PublishedTestimonials items={testimonials} language={language} />
      <section className="bg-primary py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-serif text-3xl !text-white">
              {language === 'am' ? 'የማዕከሉን ዜና ይቀበሉ' : 'Stay connected'}
            </h2>
            <p className="mt-2 text-white/85">
              {language === 'am'
                ? 'ዜናዎችንና የማህበረሰብ ዕድሎችን በኢሜይል ያግኙ።'
                : 'Receive center news and community opportunities by email.'}
            </p>
          </div>
          <NewsletterSignup language={language} />
        </div>
      </section>
    </>
  );
}

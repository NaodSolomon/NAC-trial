import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import PageBanner from '@/components/common/PageBanner';
import { CmsArticle } from '@/features/cms/components/CmsArticle';
import { loadPublicContact, type PublicContactPage } from '@/features/engagement';
import { localizedHref, translate, type Language } from '@/lib/i18n';
import { ContactForm } from './ContactForm';
import { SecureMapEmbed } from './SecureMapEmbed';

export default async function ContactPage({ language }: { language: Language }) {
  const content = await loadPublicContact(language);
  return (
    <>
      <PageBanner
        title={content.title}
        breadcrumbs={[
          { label: translate(language, 'home'), href: localizedHref('/', language) },
          { label: content.title },
        ]}
        backgroundImage={content.bannerImageUrl ?? '/images/header-bg.jpg'}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div>
            <h2 className="text-heading font-serif text-3xl font-medium">
              {language === 'am' ? 'ያነጋግሩን' : 'Get in touch'}
            </h2>
            <div className="mt-4 max-w-3xl">
              <CmsArticle content={content.description} />
            </div>
            <div className="mt-8">
              <ContactForm language={language} />
            </div>
          </div>
          <ContactDetails content={content} language={language} />
        </div>
      </section>
      {content.mapEmbedUrl && (
        <section aria-labelledby="map-heading" className="bg-secondary-bg py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 id="map-heading" className="text-heading mb-6 font-serif text-3xl">
              {language === 'am' ? 'የማዕከሉ አካባቢ' : 'Find the center'}
            </h2>
            <SecureMapEmbed url={content.mapEmbedUrl} language={language} />
          </div>
        </section>
      )}
    </>
  );
}

function ContactDetails({ content, language }: { content: PublicContactPage; language: Language }) {
  const details = [
    {
      label: language === 'am' ? 'ኢሜይል' : 'Email',
      value: content.email,
      icon: Mail,
      href: content.email ? `mailto:${content.email}` : undefined,
    },
    {
      label: language === 'am' ? 'ስልክ' : 'Phone',
      value: content.phone,
      icon: Phone,
      href: content.phone ? `tel:${content.phone.replace(/[^+\d]/g, '')}` : undefined,
    },
    { label: language === 'am' ? 'አድራሻ' : 'Address', value: content.address, icon: MapPin },
    {
      label: language === 'am' ? 'የስራ ሰዓት' : 'Office hours',
      value: language === 'am' ? 'በቀጠሮ ያነጋግሩን' : 'Contact us to arrange a visit',
      icon: Clock,
    },
  ].filter((detail) => detail.value);
  return (
    <aside
      aria-label={language === 'am' ? 'የመገናኛ መረጃ' : 'Contact information'}
      className="space-y-5"
    >
      {details.map(({ label, value, icon: Icon, href }) => (
        <section key={label} className="bg-card flex gap-4 rounded-xl border p-6 shadow-sm">
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h2 className="text-heading font-semibold">{label}</h2>
            {href ? (
              <a
                href={href}
                className="text-foreground hover:text-primary mt-1 block break-words underline"
              >
                {value}
              </a>
            ) : (
              <p className="text-foreground mt-1">{value}</p>
            )}
          </div>
        </section>
      ))}
    </aside>
  );
}

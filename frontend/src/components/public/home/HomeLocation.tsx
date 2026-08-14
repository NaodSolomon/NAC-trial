import { ConsentMapEmbed } from '@/components/shared/ConsentMapEmbed';
import type { Language } from '@/lib/i18n';
import type { HomeLocationSection } from '@/features/home/home.types';

export function HomeLocation({
  section,
  language,
}: {
  section: HomeLocationSection;
  language: Language;
}) {
  return (
    <section className="bg-secondary-bg py-16 sm:py-20" aria-labelledby="home-location-heading">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 id="home-location-heading" className="text-heading font-serif text-3xl sm:text-4xl">
            {section.heading}
          </h2>
          {section.body && <p className="text-foreground mt-4 leading-7">{section.body}</p>}
        </div>
        <ConsentMapEmbed
          url={section.mapEmbedUrl}
          language={language}
          title={language === 'am' ? 'የማዕከሉ አካባቢ ካርታ' : 'Map showing the center location'}
        />
      </div>
    </section>
  );
}

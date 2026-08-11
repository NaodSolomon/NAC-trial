import { Quote } from 'lucide-react';
import { sanitizeCmsText } from '@/features/cms';
import type { Language } from '@/lib/i18n';
import type { PublicTestimonial } from '../engagement.types';

export function PublishedTestimonials({
  items,
  language,
}: {
  items: PublicTestimonial[];
  language: Language;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="testimonials-heading" className="bg-secondary-bg py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2
          id="testimonials-heading"
          className="text-heading text-center font-serif text-3xl sm:text-4xl"
        >
          {language === 'am' ? 'የማህበረሰባችን ድምፆች' : 'Voices from our community'}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="bg-card rounded-xl border p-7 shadow-sm">
              <Quote aria-hidden="true" className="text-primary size-8" />
              <blockquote className="text-foreground mt-5 leading-7">
                {sanitizeCmsText(item.text)}
              </blockquote>
              <figcaption className="text-heading mt-5 font-semibold">
                — {sanitizeCmsText(item.name)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

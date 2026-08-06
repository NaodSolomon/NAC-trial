import Image from 'next/image';
import { homeCopy } from '@/features/home/home.copy';
import type { HomeGalleryTeaser } from '@/features/home/home.types';
import { localizedHref, type Language } from '@/lib/i18n';
import { TeaserAction } from './HomeBlogTeasers';
import { TeaserHeading } from './TeaserHeading';

export function HomeGalleryTeasers({
  items,
  language,
}: {
  items: HomeGalleryTeaser[];
  language: Language;
}) {
  if (!items.length) return null;
  const copy = homeCopy[language];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <TeaserHeading title={copy.galleryTitle} description={copy.galleryDescription} />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {items.map((item) => (
            <figure
              key={item.id}
              className="group bg-muted relative aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={item.mediaUrl}
                alt={item.altText}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                {item.title}
              </figcaption>
            </figure>
          ))}
        </div>
        <TeaserAction href={localizedHref('/gallery', language)} label={copy.galleryAction} />
      </div>
    </section>
  );
}

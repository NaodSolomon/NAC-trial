import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { homeCopy } from '@/features/home/home.copy';
import type { HomeEventTeaser } from '@/features/home/home.types';
import { localizedHref, type Language } from '@/lib/i18n';
import { TeaserAction } from './HomeBlogTeasers';
import { TeaserHeading } from './TeaserHeading';

export function HomeEventTeasers({
  events,
  language,
}: {
  events: HomeEventTeaser[];
  language: Language;
}) {
  if (!events.length) return null;
  const copy = homeCopy[language];
  return (
    <section className="bg-secondary-bg py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <TeaserHeading title={copy.eventsTitle} description={copy.eventsDescription} />
        <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <article key={event.id} className="bg-card overflow-hidden rounded-xl shadow-sm">
              <div className="relative aspect-[16/10]">
                <Image
                  src={event.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-primary flex items-center gap-2 text-xs font-semibold">
                  <CalendarDays aria-hidden="true" className="size-4" />
                  {formatEventDate(event.startDate, language)}
                </p>
                <h3 className="mt-3 text-xl font-semibold">
                  <Link
                    href={localizedHref(`/events/${event.slug}`, language)}
                    className="hover:text-primary"
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="text-foreground mt-2 flex items-start gap-2 text-sm">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  {event.location}
                </p>
                <p className="text-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                  {event.description}
                </p>
              </div>
            </article>
          ))}
        </div>
        <TeaserAction href={localizedHref('/events', language)} label={copy.eventsAction} />
      </div>
    </section>
  );
}

function formatEventDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

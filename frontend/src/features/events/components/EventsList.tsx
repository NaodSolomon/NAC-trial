import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { sanitizeCmsText } from '@/features/cms/sanitize-cms';
import { localizedHref, type Language } from '@/lib/i18n';
import type { PublicEvent } from '../event.types';
import { eventImage, eventStatus, formatEventDate, formatEventTimeRange } from '../event.utils';

export function EventsList({ events, language }: { events: PublicEvent[]; language: Language }) {
  if (!events.length) return <EventsEmptyState language={language} />;
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <article
          key={event.id}
          className="bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={eventImage(event)}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={index < 3}
              className="object-cover"
            />
            <span
              className={
                eventStatus(event) === 'past'
                  ? 'absolute top-4 left-4 rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-white'
                  : 'bg-primary absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-semibold text-white'
              }
            >
              {eventStatus(event) === 'past'
                ? language === 'am'
                  ? 'ያለፈ'
                  : 'Past'
                : language === 'am'
                  ? 'መጪ'
                  : 'Upcoming'}
            </span>
          </div>
          <div className="p-6">
            <p className="text-foreground flex items-start gap-2 text-sm">
              <Calendar aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
              {formatEventDate(event.startDate, language)}
            </p>
            <p className="text-foreground mt-2 flex items-start gap-2 text-sm">
              <Clock aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
              {formatEventTimeRange(event.startDate, event.endDate, language)}
            </p>
            <h2 className="text-heading mt-4 text-xl font-semibold">
              <Link
                href={localizedHref('/events/' + event.slug, language)}
                className="hover:text-primary"
              >
                {event.title}
              </Link>
            </h2>
            <p className="text-foreground mt-3 line-clamp-3 leading-7">
              {sanitizeCmsText(event.description)}
            </p>
            <p className="text-foreground mt-4 flex items-start gap-2 text-sm">
              <MapPin aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
              {event.location}
            </p>
            <Link
              href={localizedHref('/events/' + event.slug, language)}
              className="text-primary mt-5 inline-block font-semibold hover:underline"
            >
              {language === 'am' ? 'ዝርዝር ይመልከቱ' : 'View event'} &rarr;
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function EventsEmptyState({ language }: { language: Language }) {
  return (
    <div role="status" className="bg-card rounded-xl border p-12 text-center">
      <Calendar aria-hidden="true" className="text-primary mx-auto size-12" />
      <h2 className="text-heading mt-5 text-2xl font-semibold">
        {language === 'am' ? 'በዚህ ምድብ ውስጥ ዝግጅት የለም' : 'No events in this view'}
      </h2>
      <p className="text-foreground mt-2">
        {language === 'am'
          ? 'ሌላ የጊዜ ማጣሪያ ይምረጡ።'
          : 'Choose another timeframe or check back for new events.'}
      </p>
    </div>
  );
}

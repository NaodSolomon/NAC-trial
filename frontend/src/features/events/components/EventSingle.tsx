import Image from 'next/image';
import { Calendar, CalendarPlus, Clock, MapPin } from 'lucide-react';
import { CmsArticle } from '@/features/cms/components/CmsArticle';
import type { Language } from '@/lib/i18n';
import type { PublicEvent } from '../event.types';
import {
  calendarDownloadHref,
  eventImage,
  eventStatus,
  formatEventDate,
  formatEventTimeRange,
} from '../event.utils';
import { RsvpForm } from './RsvpForm';

export function EventSingle({ event, language }: { event: PublicEvent; language: Language }) {
  const isPast = eventStatus(event) === 'past';
  return (
    <article>
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <Image
          src={eventImage(event)}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover"
        />
      </div>
      <div className="bg-card mt-7 grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-3">
        <div className="flex items-start gap-3">
          <Calendar aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-xs">{language === 'am' ? 'ቀን' : 'Date'}</p>
            <p className="text-heading font-semibold">
              {formatEventDate(event.startDate, language)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-xs">{language === 'am' ? 'ሰዓት' : 'Time'}</p>
            <p className="text-heading font-semibold">
              {formatEventTimeRange(event.startDate, event.endDate, language)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin aria-hidden="true" className="text-primary mt-1 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-xs">{language === 'am' ? 'ቦታ' : 'Location'}</p>
            <p className="text-heading font-semibold">{event.location}</p>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <CmsArticle content={event.description} />
      </div>
      <a
        href={calendarDownloadHref(event.slug, language)}
        download={event.slug + '.ics'}
        className="text-primary mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg border px-5 font-semibold hover:underline"
      >
        <CalendarPlus aria-hidden="true" className="size-5" />
        {language === 'am' ? 'ወደ ቀን መቁጠሪያ ያክሉ' : 'Add to calendar (.ics)'}
      </a>
      <div className="mt-10 border-t pt-10">
        {event.rsvpEnabled && !isPast ? (
          <RsvpForm eventId={event.id} language={language} />
        ) : (
          <div role="status" className="bg-secondary-bg rounded-xl border p-6">
            <h2 className="text-heading text-xl font-semibold">
              {isPast
                ? language === 'am'
                  ? 'ይህ ዝግጅት አልፏል'
                  : 'This event has ended'
                : language === 'am'
                  ? 'ምዝገባ አልተከፈተም'
                  : 'RSVP is not available'}
            </h2>
          </div>
        )}
      </div>
    </article>
  );
}

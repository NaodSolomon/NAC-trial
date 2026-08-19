import { API_URL } from '@/lib/constants';
import type { Language } from '@/lib/i18n';
import type { EventTimeframe, EventView, PublicEvent } from './event.types';

export const EVENT_TIME_ZONE = 'Africa/Addis_Ababa';

export function parseEventTimeframe(value: string | undefined): EventTimeframe {
  return value === 'past' || value === 'all' ? value : 'upcoming';
}

export function parseEventView(value: string | undefined): EventView {
  return value === 'calendar' ? 'calendar' : 'list';
}

export function formatEventDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), {
    dateStyle: 'long',
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(value));
}

export function formatEventTimeRange(
  startDate: string,
  endDate: string,
  language: Language,
): string {
  const formatter = new Intl.DateTimeFormat(locale(language), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: 'short',
  });
  return formatter.formatRange(new Date(startDate), new Date(endDate));
}

export function eventDateKey(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: EVENT_TIME_ZONE,
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function eventStatus(event: PublicEvent, now = new Date()): 'upcoming' | 'past' {
  return new Date(event.endDate) > now ? 'upcoming' : 'past';
}

export function eventImage(event: Pick<PublicEvent, 'slug' | 'imageUrl'>): string {
  if (event.imageUrl) return event.imageUrl;
  // Template placeholder until the event has its own photo.
  let hash = 0;
  for (const character of event.slug) hash = (hash + character.charCodeAt(0)) % 3;
  return `/images/event_${hash + 1}.jpg`;
}

export function calendarDownloadHref(slug: string, language: Language): string {
  return `${API_URL.replace(/\/$/, '')}/public/events/${encodeURIComponent(slug)}/calendar.ics?languageCode=${language}`;
}

function locale(language: Language) {
  return language === 'am' ? 'am-ET' : 'en-US';
}

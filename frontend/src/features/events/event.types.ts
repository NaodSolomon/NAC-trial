import type { Language } from '@/lib/i18n';

export type EventTimeframe = 'upcoming' | 'past' | 'all';
export type EventView = 'list' | 'calendar';

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  imageUrl: string | null;
  rsvpEnabled: boolean;
  status: 'PUBLISHED';
  languageCode: Language;
}

export interface PublicEventPage {
  data: PublicEvent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

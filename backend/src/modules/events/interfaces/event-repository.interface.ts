import { Event, EventRsvp, NewEvent } from '../../../database/schema';

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');

export interface EventCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  languageCode?: 'en' | 'am';
  timeframe?: 'upcoming' | 'past' | 'all';
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface EventRepository {
  list(criteria: EventCriteria, publicOnly: boolean): Promise<unknown>;
  findPublicBySlug(slug: string, languageCode: 'en' | 'am'): Promise<Event | null>;
  findById(id: string): Promise<Event | null>;
  create(data: NewEvent, actorId: string): Promise<Event>;
  update(id: string, data: Partial<NewEvent>, actorId: string): Promise<Event | null>;
  delete(id: string, actorId: string): Promise<boolean>;
  createRsvp(data: {
    eventId: string;
    name: string;
    email: string;
    attendees: number;
  }): Promise<EventRsvp>;
  listRsvps(eventId: string, criteria: EventCriteria): Promise<unknown>;
  allRsvps(eventId: string): Promise<EventRsvp[]>;
}

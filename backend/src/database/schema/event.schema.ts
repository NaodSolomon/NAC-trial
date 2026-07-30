import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { eventRsvpStatusEnum, eventStatusEnum, languageCodeEnum } from './enums';

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationKey: uuid('translation_key').defaultRandom().notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    startDate: timestamp('start_date', { withTimezone: true, precision: 3 }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true, precision: 3 }).notNull(),
    location: varchar('location', { length: 500 }).notNull(),
    rsvpEnabled: boolean('rsvp_enabled').default(false).notNull(),
    status: eventStatusEnum('status').default('DRAFT').notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('events_slug_language_unique_idx').on(table.slug, table.languageCode),
    uniqueIndex('events_translation_language_unique_idx').on(
      table.translationKey,
      table.languageCode,
    ),
    index('events_status_language_start_idx').on(table.status, table.languageCode, table.startDate),
    index('events_created_by_idx').on(table.createdBy),
    index('events_title_trgm_idx').using('gin', table.title.asc().op('gin_trgm_ops')),
    index('events_description_trgm_idx').using(
      'gin',
      table.description.asc().op('gin_trgm_ops'),
    ),
    check('events_end_after_start_check', sql`${table.endDate} > ${table.startDate}`),
  ],
);

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    attendees: integer('attendees').notNull(),
    status: eventRsvpStatusEnum('status').default('CONFIRMED').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('event_rsvps_event_email_unique_idx').on(table.eventId, table.email),
    index('event_rsvps_event_created_at_idx').on(table.eventId, table.createdAt),
    check('event_rsvps_attendees_positive_check', sql`${table.attendees} between 1 and 20`),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventRsvp = typeof eventRsvps.$inferSelect;

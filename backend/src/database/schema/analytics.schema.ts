import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { analyticsDeviceTypeEnum, analyticsEventTypeEnum } from './enums';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: analyticsEventTypeEnum('event_type').notNull(),
    pageUrl: varchar('page_url', { length: 2048 }).notNull(),
    country: varchar('country', { length: 2 }),
    deviceType: analyticsDeviceTypeEnum('device_type').default('unknown').notNull(),
    referrer: varchar('referrer', { length: 2048 }),
    metadata: jsonb('metadata').$type<Record<string, never>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    index('analytics_events_type_created_at_idx').on(table.eventType, table.createdAt),
    index('analytics_events_country_created_at_idx').on(table.country, table.createdAt),
    index('analytics_events_page_created_at_idx').on(table.pageUrl, table.createdAt),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

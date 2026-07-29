import { jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { languageCodeEnum } from './enums';

export const siteSettings = pgTable(
  'site_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 50 }).default('global').notNull(),
    siteName: varchar('site_name', { length: 150 }).notNull(),
    defaultLanguage: languageCodeEnum('default_language').default('en').notNull(),
    supportedLanguages: jsonb('supported_languages')
      .$type<Array<'en' | 'am'>>()
      .default(['en', 'am'])
      .notNull(),
    contactEmail: varchar('contact_email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: varchar('address', { length: 500 }),
    updatedBy: uuid('updated_by').references(() => admins.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('site_settings_key_unique_idx').on(table.key)],
);

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;

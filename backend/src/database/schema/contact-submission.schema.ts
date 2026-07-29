import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { languageCodeEnum } from './enums';

export const contactSubmissions = pgTable(
  'contact_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 200 }),
    message: text('message').notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('contact_submissions_email_idx').on(table.email),
    index('contact_submissions_created_at_idx').on(table.createdAt),
  ],
);

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;

import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { languageCodeEnum, testimonialStatusEnum, volunteerApplicationStatusEnum } from './enums';

export const volunteerApplications = pgTable(
  'volunteer_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    roleInterest: varchar('role_interest', { length: 150 }).notNull(),
    message: text('message').notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    status: volunteerApplicationStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    index('volunteer_applications_email_idx').on(table.email),
    index('volunteer_applications_status_idx').on(table.status),
    index('volunteer_applications_created_at_idx').on(table.createdAt),
  ],
);

export const testimonials = pgTable(
  'testimonials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationKey: uuid('translation_key').defaultRandom().notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    text: text('text').notNull(),
    languageCode: languageCodeEnum('language_code').notNull(),
    status: testimonialStatusEnum('status').default('DRAFT').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('testimonials_translation_language_unique_idx').on(
      table.translationKey,
      table.languageCode,
    ),
    index('testimonials_status_language_idx').on(table.status, table.languageCode),
    index('testimonials_created_by_idx').on(table.createdBy),
  ],
);

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('newsletter_subscribers_email_unique_idx').on(table.email),
    index('newsletter_subscribers_created_at_idx').on(table.createdAt),
  ],
);

export type VolunteerApplication = typeof volunteerApplications.$inferSelect;
export type NewVolunteerApplication = typeof volunteerApplications.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;

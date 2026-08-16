import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { contentStatusEnum, languageCodeEnum } from './enums';

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    translationKey: varchar('translation_key', { length: 180 }).notNull(),
    category: varchar('category', { length: 120 }),
    question: varchar('question', { length: 500 }).notNull(),
    answer: text('answer').notNull(),
    status: contentStatusEnum('status').default('DRAFT').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('faqs_translation_language_unique_idx').on(table.translationKey, table.languageCode),
    index('faqs_language_status_order_idx').on(table.languageCode, table.status, table.sortOrder),
    index('faqs_category_idx').on(table.category),
    index('faqs_question_trgm_idx').using('gin', table.question.asc().op('gin_trgm_ops')),
    index('faqs_answer_trgm_idx').using('gin', table.answer.asc().op('gin_trgm_ops')),
  ],
);

export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;

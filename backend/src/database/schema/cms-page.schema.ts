import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { contentStatusEnum, languageCodeEnum } from './enums';

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationKey: uuid('translation_key').defaultRandom().notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    languageCode: languageCodeEnum('language_code').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    status: contentStatusEnum('status').default('DRAFT').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    seoImageUrl: varchar('seo_image_url', { length: 2048 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    scheduledAt: timestamp('scheduled_at', {
      withTimezone: true,
      precision: 3,
    }),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      precision: 3,
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
  (table) => [
    uniqueIndex('cms_pages_slug_language_unique_idx').on(table.slug, table.languageCode),
    uniqueIndex('cms_pages_translation_language_unique_idx').on(
      table.translationKey,
      table.languageCode,
    ),
    index('cms_pages_status_idx').on(table.status),
    index('cms_pages_scheduled_at_idx').on(table.scheduledAt),
    index('cms_pages_created_by_idx').on(table.createdBy),
    index('cms_pages_title_trgm_idx').using('gin', table.title.asc().op('gin_trgm_ops')),
    index('cms_pages_content_trgm_idx').using('gin', table.content.asc().op('gin_trgm_ops')),
  ],
);

export type CmsPage = typeof cmsPages.$inferSelect;
export type NewCmsPage = typeof cmsPages.$inferInsert;

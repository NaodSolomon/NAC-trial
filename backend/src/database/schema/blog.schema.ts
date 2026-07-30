import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { contentStatusEnum, languageCodeEnum } from './enums';

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 180 }).notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }).notNull(),
    content: text('content').notNull(),
    status: contentStatusEnum('status').default('DRAFT').notNull(),
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),
    seoImageUrl: varchar('seo_image_url', { length: 2048 }),
    createdBy: uuid('created_by').notNull().references(() => admins.id, { onDelete: 'restrict' }),
    publishedAt: timestamp('published_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('blog_posts_slug_language_unique_idx').on(table.slug, table.languageCode),
    index('blog_posts_status_published_idx').on(table.status, table.publishedAt),
    index('blog_posts_title_trgm_idx').using('gin', table.title.asc().op('gin_trgm_ops')),
    index('blog_posts_excerpt_trgm_idx').using('gin', table.excerpt.asc().op('gin_trgm_ops')),
    index('blog_posts_content_trgm_idx').using('gin', table.content.asc().op('gin_trgm_ops')),
  ],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

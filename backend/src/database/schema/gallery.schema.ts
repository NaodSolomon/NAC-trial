import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { languageCodeEnum } from './enums';
import { mediaAssets } from './media.schema';

export const galleryItems = pgTable(
  'gallery_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    altText: varchar('alt_text', { length: 500 }).notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('gallery_items_media_unique_idx').on(table.mediaId),
    index('gallery_items_language_created_at_idx').on(table.languageCode, table.createdAt),
    index('gallery_items_created_by_idx').on(table.createdBy),
  ],
);

export type GalleryItem = typeof galleryItems.$inferSelect;
export type NewGalleryItem = typeof galleryItems.$inferInsert;

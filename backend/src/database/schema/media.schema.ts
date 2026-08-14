import {
  bigint,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { languageCodeEnum, mediaTypeEnum, outboxStatusEnum } from './enums';

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    objectKey: varchar('object_key', { length: 1024 }).notNull(),
    publicUrl: varchar('public_url', { length: 2048 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 150 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    type: mediaTypeEnum('type').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('media_assets_object_key_unique_idx').on(table.objectKey),
    index('media_assets_type_idx').on(table.type),
    index('media_assets_uploaded_by_idx').on(table.uploadedBy),
    index('media_assets_created_at_idx').on(table.createdAt),
  ],
);

export const mediaTranslations = pgTable(
  'media_translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    languageCode: languageCodeEnum('language_code').notNull(),
    altText: varchar('alt_text', { length: 500 }).notNull(),
    caption: varchar('caption', { length: 1000 }),
  },
  (table) => [
    uniqueIndex('media_translations_media_language_unique_idx').on(
      table.mediaId,
      table.languageCode,
    ),
  ],
);

export const storageDeletionOutbox = pgTable(
  'storage_deletion_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    objectKey: varchar('object_key', { length: 1024 }).notNull(),
    status: outboxStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true, precision: 3 }),
    lockToken: uuid('lock_token'),
    lastError: varchar('last_error', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, precision: 3 }),
  },
  (table) => [
    uniqueIndex('storage_deletion_outbox_object_key_unique_idx').on(table.objectKey),
    index('storage_deletion_outbox_delivery_idx').on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
  ],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type MediaTranslation = typeof mediaTranslations.$inferSelect;
export type NewMediaTranslation = typeof mediaTranslations.$inferInsert;

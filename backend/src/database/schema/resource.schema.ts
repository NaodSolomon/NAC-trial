import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { contentStatusEnum, languageCodeEnum } from './enums';

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    fileUrl: varchar('file_url', { length: 2048 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    languageCode: languageCodeEnum('language_code').default('en').notNull(),
    status: contentStatusEnum('status').default('DRAFT').notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    createdBy: uuid('created_by').notNull().references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [index('resources_status_language_idx').on(table.status, table.languageCode)],
);

export type Resource = typeof resources.$inferSelect;

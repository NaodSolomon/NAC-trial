import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';
import { languageCodeEnum } from './enums';

export const navigationItems = pgTable(
  'navigation_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    label: varchar('label', { length: 100 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    order: integer('display_order').default(0).notNull(),
    languageCode: languageCodeEnum('language_code').notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
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
    index('navigation_items_language_order_idx').on(table.languageCode, table.order),
    index('navigation_items_created_by_idx').on(table.createdBy),
  ],
);

export type NavigationItem = typeof navigationItems.$inferSelect;
export type NewNavigationItem = typeof navigationItems.$inferInsert;

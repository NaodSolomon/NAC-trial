import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    usedAt: timestamp('used_at', {
      withTimezone: true,
      precision: 3,
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_token_hash_unique_idx').on(table.tokenHash),
    index('password_reset_tokens_admin_id_idx').on(table.adminId),
    index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
  ],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

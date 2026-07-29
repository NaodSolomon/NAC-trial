import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { admins } from './admin.schema';

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    tokenFamilyId: uuid('token_family_id').defaultRandom().notNull(),
    userAgent: varchar('user_agent', { length: 512 }),
    ipHash: varchar('ip_hash', { length: 64 }),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    lastUsedAt: timestamp('last_used_at', {
      withTimezone: true,
      precision: 3,
    }),
    revokedAt: timestamp('revoked_at', {
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
    uniqueIndex('auth_sessions_token_hash_unique_idx').on(table.tokenHash),
    index('auth_sessions_admin_id_idx').on(table.adminId),
    index('auth_sessions_family_id_idx').on(table.tokenFamilyId),
    index('auth_sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;

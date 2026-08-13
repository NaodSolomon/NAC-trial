import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  donationCurrencyEnum,
  donationGatewayEnum,
  donationStatusEnum,
  outboxStatusEnum,
} from './enums';

export const donations = pgTable(
  'donations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    donorName: varchar('donor_name', { length: 100 }).notNull(),
    donorEmail: varchar('donor_email', { length: 255 }).notNull(),
    message: text('message'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: donationCurrencyEnum('currency').notNull(),
    gateway: donationGatewayEnum('gateway').notNull(),
    status: donationStatusEnum('status').default('INITIATED').notNull(),
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    externalTransactionId: varchar('external_transaction_id', { length: 255 }),
    receiptUrl: varchar('receipt_url', { length: 2048 }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, precision: 3 }),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('donations_provider_order_unique_idx').on(table.gateway, table.providerOrderId),
    uniqueIndex('donations_external_transaction_unique_idx').on(
      table.gateway,
      table.externalTransactionId,
    ),
    index('donations_status_idx').on(table.status),
    index('donations_created_at_idx').on(table.createdAt),
    index('donations_currency_idx').on(table.currency),
  ],
);

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gateway: donationGatewayEnum('gateway').notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 150 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('payment_webhook_events_gateway_event_unique_idx').on(
      table.gateway,
      table.providerEventId,
    ),
  ],
);

export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
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
    index('notification_outbox_status_created_idx').on(table.status, table.createdAt),
    index('notification_outbox_delivery_idx').on(
      table.type,
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
  ],
);

export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;

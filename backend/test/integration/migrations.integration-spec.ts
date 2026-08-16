import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connectTestPostgres } from '../helpers/postgres-test.helper';
import { itWithPostgres } from '../helpers/database-availability.helper';

const expectedTables = [
  'admins',
  'analytics_events',
  'audit_logs',
  'auth_sessions',
  'blog_posts',
  'cms_pages',
  'contact_submissions',
  'donations',
  'event_rsvps',
  'events',
  'faqs',
  'gallery_items',
  'media_assets',
  'media_translations',
  'navigation_items',
  'newsletter_subscribers',
  'notification_outbox',
  'password_reset_tokens',
  'payment_webhook_events',
  'resource_download_logs',
  'resources',
  'site_settings',
  'storage_deletion_outbox',
  'testimonials',
  'volunteer_applications',
];

const searchIndexes = [
  'blog_posts_content_trgm_idx',
  'blog_posts_excerpt_trgm_idx',
  'blog_posts_title_trgm_idx',
  'cms_pages_content_trgm_idx',
  'cms_pages_title_trgm_idx',
  'events_description_trgm_idx',
  'events_title_trgm_idx',
];

describe('Drizzle migration chain', () => {
  it('has one ordered SQL file for every journal entry', () => {
    const directory = resolve(__dirname, '../../src/database/migrations');
    const journal = JSON.parse(readFileSync(resolve(directory, 'meta/_journal.json'), 'utf8')) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, index) => index),
    );
    for (const entry of journal.entries) {
      expect(existsSync(resolve(directory, `${entry.tag}.sql`))).toBe(true);
    }
  });

  itWithPostgres('applies the complete chain to an empty PostgreSQL schema', async () => {
    const context = await connectTestPostgres();
    try {
      const tables = await context.pool.query<{ table_name: string }>(
        `select table_name
         from information_schema.tables
         where table_schema = 'public'
         order by table_name`,
      );
      expect(tables.rows.map((row) => row.table_name)).toEqual(expectedTables);

      const migrations = await context.pool.query<{ count: string }>(
        'select count(*) from drizzle.__drizzle_migrations',
      );
      expect(Number(migrations.rows[0].count)).toBe(20);

      const donationGateways = await context.pool.query<{ enumlabel: string }>(
        `select enumlabel
         from pg_enum
         join pg_type on pg_type.oid = pg_enum.enumtypid
         where pg_type.typname = 'donation_gateway'
         order by enumsortorder`,
      );
      expect(donationGateways.rows.map((row) => row.enumlabel)).toEqual([
        'SIMULATED',
        'PAYPAL',
        'TELEBIRR',
        'CBE',
      ]);

      const storageOutboxColumns = await context.pool.query<{ column_name: string }>(
        `select column_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'storage_deletion_outbox'
         order by ordinal_position`,
      );
      expect(storageOutboxColumns.rows.map((row) => row.column_name)).toEqual([
        'id',
        'object_key',
        'status',
        'attempts',
        'next_attempt_at',
        'locked_at',
        'lock_token',
        'last_error',
        'created_at',
        'processed_at',
      ]);

      const downloadLogColumns = await context.pool.query<{ column_name: string }>(
        `select column_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'resource_download_logs'
         order by ordinal_position`,
      );
      expect(downloadLogColumns.rows.map((row) => row.column_name)).toEqual([
        'id',
        'resource_id',
        'country',
        'downloaded_at',
      ]);

      const outboxColumns = await context.pool.query<{ column_name: string }>(
        `select column_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'notification_outbox'
           and column_name = any($1::text[])
         order by column_name`,
        [['last_error', 'locked_at', 'lock_token', 'next_attempt_at']],
      );
      expect(outboxColumns.rows.map((row) => row.column_name)).toEqual([
        'last_error',
        'lock_token',
        'locked_at',
        'next_attempt_at',
      ]);

      const socialLinksColumn = await context.pool.query<{
        data_type: string;
        is_nullable: string;
        column_default: string;
      }>(
        `select data_type, is_nullable, column_default
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'site_settings'
           and column_name = 'social_links'`,
      );
      expect(socialLinksColumn.rows).toEqual([
        {
          data_type: 'jsonb',
          is_nullable: 'NO',
          column_default: "'{}'::jsonb",
        },
      ]);

      const sessionIndex = await context.pool.query<{ indexdef: string }>(
        `select indexdef
         from pg_indexes
         where schemaname = 'public'
           and indexname = 'auth_sessions_active_expires_created_idx'`,
      );
      expect(sessionIndex.rows).toHaveLength(1);
      expect(sessionIndex.rows[0].indexdef).toContain('WHERE (revoked_at IS NULL)');

      const resetIndexes = await context.pool.query<{ indexname: string }>(
        `select indexname
         from pg_indexes
         where schemaname = 'public'
           and indexname = any($1::text[])
         order by indexname`,
        [
          [
            'password_reset_tokens_admin_id_idx',
            'password_reset_tokens_expires_at_idx',
            'password_reset_tokens_token_hash_unique_idx',
          ],
        ],
      );
      expect(resetIndexes.rows.map((row) => row.indexname)).toEqual([
        'password_reset_tokens_admin_id_idx',
        'password_reset_tokens_expires_at_idx',
        'password_reset_tokens_token_hash_unique_idx',
      ]);

      const seoKeywordsColumn = await context.pool.query<{
        data_type: string;
        udt_name: string;
      }>(
        `select data_type, udt_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'cms_pages'
           and column_name = 'seo_keywords'`,
      );
      expect(seoKeywordsColumn.rows).toEqual([{ data_type: 'ARRAY', udt_name: '_text' }]);

      const extension = await context.pool.query<{ exists: boolean }>(
        `select exists(
           select 1 from pg_extension where extname = 'pg_trgm'
         )`,
      );
      expect(extension.rows[0].exists).toBe(true);

      const indexes = await context.pool.query<{ indexname: string; indexdef: string }>(
        `select indexname, indexdef
         from pg_indexes
         where schemaname = 'public' and indexname = any($1::text[])
         order by indexname`,
        [searchIndexes],
      );
      expect(indexes.rows.map((row) => row.indexname)).toEqual(searchIndexes);
      expect(indexes.rows.every((row) => row.indexdef.includes('gin_trgm_ops'))).toBe(true);
    } finally {
      await context.pool.end();
    }
  });

  itWithPostgres('backfills only records with an identifiable fake-provider signature', async () => {
    const context = await connectTestPostgres();
    try {
      await context.pool.query(
        `insert into donations
          (id, donor_name, donor_email, amount, currency, gateway, provider_order_id)
         values
          ('00000000-0000-4000-8000-000000001601', 'Fake donor', 'fake@example.org', 25, 'USD', 'PAYPAL', 'FAKE-ORDER-1'),
          ('00000000-0000-4000-8000-000000001602', 'PayPal donor', 'paypal@example.org', 25, 'USD', 'PAYPAL', 'PAYPAL-ORDER-1')`,
      );
      await context.pool.query(
        `insert into payment_webhook_events (gateway, provider_event_id, event_type)
         values
          ('PAYPAL', 'FAKE-EVENT-1', 'FAKE.PAYMENT.CONFIRMED'),
          ('PAYPAL', 'PAYPAL-EVENT-1', 'PAYMENT.CAPTURE.COMPLETED')`,
      );

      const migration = readFileSync(
        resolve(
          __dirname,
          '../../src/database/migrations/0017_backfill_simulated_donation_gateways.sql',
        ),
        'utf8',
      );
      for (const statement of migration.split('--> statement-breakpoint')) {
        await context.pool.query(statement);
      }

      const donationRows = await context.pool.query<{ provider_order_id: string; gateway: string }>(
        `select provider_order_id, gateway::text
         from donations
         where id in (
           '00000000-0000-4000-8000-000000001601',
           '00000000-0000-4000-8000-000000001602'
         )
         order by provider_order_id`,
      );
      expect(donationRows.rows).toEqual([
        { provider_order_id: 'FAKE-ORDER-1', gateway: 'SIMULATED' },
        { provider_order_id: 'PAYPAL-ORDER-1', gateway: 'PAYPAL' },
      ]);

      const eventRows = await context.pool.query<{ provider_event_id: string; gateway: string }>(
        `select provider_event_id, gateway::text
         from payment_webhook_events
         where provider_event_id in ('FAKE-EVENT-1', 'PAYPAL-EVENT-1')
         order by provider_event_id`,
      );
      expect(eventRows.rows).toEqual([
        { provider_event_id: 'FAKE-EVENT-1', gateway: 'SIMULATED' },
        { provider_event_id: 'PAYPAL-EVENT-1', gateway: 'PAYPAL' },
      ]);
    } finally {
      await context.pool.end();
    }
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connectTestPostgres } from '../helpers/postgres-test.helper';

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
  'gallery_items',
  'media_assets',
  'media_translations',
  'navigation_items',
  'newsletter_subscribers',
  'notification_outbox',
  'payment_webhook_events',
  'resources',
  'site_settings',
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

  const itWithPostgres = process.env.TEST_DATABASE_URL ? it : it.skip;
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
      expect(Number(migrations.rows[0].count)).toBe(10);

      const sessionIndex = await context.pool.query<{ indexdef: string }>(
        `select indexdef
         from pg_indexes
         where schemaname = 'public'
           and indexname = 'auth_sessions_active_expires_created_idx'`,
      );
      expect(sessionIndex.rows).toHaveLength(1);
      expect(sessionIndex.rows[0].indexdef).toContain('WHERE (revoked_at IS NULL)');

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
});

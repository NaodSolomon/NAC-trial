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
      expect(Number(migrations.rows[0].count)).toBe(8);
    } finally {
      await context.pool.end();
    }
  });
});

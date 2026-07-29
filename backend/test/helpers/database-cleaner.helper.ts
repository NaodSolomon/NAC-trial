import { sql } from 'drizzle-orm';
import { PostgresTestContext } from './postgres-test.helper';

function assertDedicatedTestDatabase(): void {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required');

  const databaseName = new URL(connectionString).pathname.replace(/^\//, '');
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error(
      `Refusing to clean a database not explicitly named for testing: ${databaseName}`,
    );
  }
}

export async function cleanTestDatabase(context: PostgresTestContext): Promise<void> {
  assertDedicatedTestDatabase();
  await context.db.execute(sql`
    do $$
    declare table_record record;
    begin
      for table_record in
        select tablename
        from pg_tables
        where schemaname = 'public'
          and tablename <> '__drizzle_migrations'
      loop
        execute format(
          'truncate table %I.%I restart identity cascade',
          'public',
          table_record.tablename
        );
      end loop;
    end $$;
  `);
}

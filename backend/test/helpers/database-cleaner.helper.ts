import { sql } from 'drizzle-orm';
import { PostgresTestContext } from './postgres-test.helper';
import { requireDedicatedTestDatabase } from './test-database-safety.helper';

export async function cleanTestDatabase(context: PostgresTestContext): Promise<void> {
  requireDedicatedTestDatabase();
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

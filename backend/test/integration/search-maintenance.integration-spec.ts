import { PostgresSearchMaintenanceRepository } from '../../src/modules/search/repositories/postgres-search-maintenance.repository';
import { SEARCH_TRIGRAM_INDEXES } from '../../src/modules/search/interfaces/search-maintenance-repository.interface';
import { cleanTestDatabase } from '../helpers/database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from '../helpers/postgres-test.helper';
import { describeWithPostgres } from '../helpers/database-availability.helper';

describeWithPostgres('Search index maintenance (PostgreSQL)', () => {
  let context: PostgresTestContext;
  let repository: PostgresSearchMaintenanceRepository;

  beforeAll(async () => {
    context = await connectTestPostgres();
    repository = new PostgresSearchMaintenanceRepository(context.pool);
  });

  beforeEach(async () => {
    await cleanTestDatabase(context);
  });

  afterAll(async () => {
    await context?.pool.end();
  });

  it('concurrently rebuilds every allowlisted index and leaves PostgreSQL reporting them valid', async () => {
    await expect(repository.rebuild()).resolves.toMatchObject({
      status: 'completed',
      indexes: [...SEARCH_TRIGRAM_INDEXES],
      startedAt: expect.any(Date),
      completedAt: expect.any(Date),
      durationMs: expect.any(Number),
    });

    const indexes = await context.pool.query<{
      index_name: string;
      indisvalid: boolean;
      indisready: boolean;
    }>(
      `select index_class.relname as index_name, index_record.indisvalid, index_record.indisready
       from pg_index index_record
       join pg_class index_class on index_class.oid = index_record.indexrelid
       join pg_namespace namespace_record on namespace_record.oid = index_class.relnamespace
       where namespace_record.nspname = 'public'
         and index_class.relname = any($1::text[])
       order by index_class.relname`,
      [[...SEARCH_TRIGRAM_INDEXES]],
    );
    expect(indexes.rows.map((row) => row.index_name)).toEqual([...SEARCH_TRIGRAM_INDEXES].sort());
    expect(indexes.rows.every((row) => row.indisvalid && row.indisready)).toBe(true);
  });

  it('returns busy while another connection holds the dedicated advisory lock', async () => {
    const lockClient = await context.pool.connect();
    try {
      await lockClient.query('SELECT pg_advisory_lock($1, $2)', [50_325, 26]);
      await expect(repository.rebuild()).resolves.toEqual({ status: 'busy' });
    } finally {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [50_325, 26]);
      lockClient.release();
    }
  });
});

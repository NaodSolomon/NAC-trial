import { Pool, PoolClient, QueryResult } from 'pg';
import { SEARCH_TRIGRAM_INDEXES } from '../interfaces/search-maintenance-repository.interface';
import { PostgresSearchMaintenanceRepository } from './postgres-search-maintenance.repository';

describe('PostgresSearchMaintenanceRepository', () => {
  let client: { query: jest.Mock; release: jest.Mock };
  let repository: PostgresSearchMaintenanceRepository;

  beforeEach(() => {
    client = {
      query: jest.fn(async (sql: string) => {
        if (sql.startsWith('SELECT pg_try_advisory_lock')) {
          return { rows: [{ acquired: true }] } as QueryResult;
        }
        return { rows: [] } as unknown as QueryResult;
      }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(client as unknown as PoolClient),
    } as unknown as Pool;
    repository = new PostgresSearchMaintenanceRepository(pool);
  });

  it('rebuilds exactly the seven compile-time allowlisted indexes and releases the same client', async () => {
    await expect(repository.rebuild()).resolves.toMatchObject({
      status: 'completed',
      indexes: [...SEARCH_TRIGRAM_INDEXES],
    });

    const reindexQueries = client.query.mock.calls
      .map(([sql]) => sql as string)
      .filter((sql) => sql.startsWith('REINDEX'));
    expect(reindexQueries).toEqual(
      SEARCH_TRIGRAM_INDEXES.map(
        (indexName) => `REINDEX INDEX CONCURRENTLY "public"."${indexName}"`,
      ),
    );
    expect(client.query).toHaveBeenLastCalledWith(
      'SELECT pg_advisory_unlock($1, $2)',
      [50_325, 26],
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('returns busy without touching an index when another connection owns the lock', async () => {
    client.query.mockResolvedValueOnce({ rows: [{ acquired: false }] });

    await expect(repository.rebuild()).resolves.toEqual({ status: 'busy' });
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('unlocks and propagates a failed rebuild', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT pg_try_advisory_lock')) {
        return { rows: [{ acquired: true }] };
      }
      if (sql.includes('events_title_trgm_idx')) {
        throw new Error('PostgreSQL reindex failure');
      }
      return { rows: [] };
    });

    await expect(repository.rebuild()).rejects.toThrow('PostgreSQL reindex failure');
    expect(client.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1, $2)', [50_325, 26]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

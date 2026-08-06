import { Pool, PoolClient, QueryResult } from 'pg';
import { PostgresScheduledPublishingLock } from './postgres-scheduled-publishing-lock.repository';

describe('PostgresScheduledPublishingLock', () => {
  let client: { query: jest.Mock; release: jest.Mock };
  let lock: PostgresScheduledPublishingLock;

  beforeEach(() => {
    client = {
      query: jest.fn().mockResolvedValue({ rows: [{ acquired: true }] } as QueryResult),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(client as unknown as PoolClient),
    } as unknown as Pool;
    lock = new PostgresScheduledPublishingLock(pool);
  });

  it('runs the operation while holding and then releasing the dedicated lock', async () => {
    const operation = jest.fn().mockResolvedValue(2);

    await expect(lock.runExclusive(operation)).resolves.toEqual({ acquired: true, value: 2 });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_try_advisory_lock($1, $2) AS acquired',
      [50_325, 5],
    );
    expect(client.query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock($1, $2)', [50_325, 5]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('does not run when another worker owns the lock', async () => {
    client.query.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    const operation = jest.fn();

    await expect(lock.runExclusive(operation)).resolves.toEqual({ acquired: false });
    expect(operation).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('unlocks and propagates a publishing failure', async () => {
    await expect(
      lock.runExclusive(async () => {
        throw new Error('publishing failed');
      }),
    ).rejects.toThrow('publishing failed');
    expect(client.query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock($1, $2)', [50_325, 5]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

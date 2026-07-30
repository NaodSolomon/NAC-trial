import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabasePool } from './drizzle.module';

describe('createDatabasePool', () => {
  it('handles idle PostgreSQL client errors without throwing from the EventEmitter', async () => {
    const config = new ConfigService({
      database: {
        connection: {
          connectionString: 'postgresql://test:test@127.0.0.1:5432/nehemiah_test',
        },
      },
    });
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const pool = createDatabasePool(config);
    const error = Object.assign(new Error('terminating connection'), { code: '57P01' });

    expect(pool.listenerCount('error')).toBeGreaterThan(0);
    expect(() => pool.emit('error', error, {} as never)).not.toThrow();
    expect(logger).toHaveBeenCalledWith(
      'PostgreSQL pool reported an idle client error (57P01): terminating connection',
    );

    logger.mockRestore();
    await pool.end();
  });
});

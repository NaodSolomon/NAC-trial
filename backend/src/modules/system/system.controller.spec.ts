import { SystemController } from './system.controller';

describe('SystemController', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'runtime.trialMode' ? true : 'fake')),
  };

  it('reports database health only after a successful probe', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
    const cache = { ping: jest.fn().mockResolvedValue(true) };
    const controller = new SystemController(db as never, config as never, cache as never);
    await expect(controller.health()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('reports PostgreSQL and Redis failures independently', async () => {
    const db = { execute: jest.fn().mockRejectedValue(new Error('database unavailable')) };
    const cache = { ping: jest.fn().mockResolvedValue(true) };
    const controller = new SystemController(db as never, config as never, cache as never);
    await expect(controller.health()).resolves.toMatchObject({
      status: 'degraded',
      checks: { postgresql: 'unavailable', redis: 'connected' },
    });
  });

  it('stays available when only Redis is down', async () => {
    const db = { execute: jest.fn().mockResolvedValue({}) };
    const cache = { ping: jest.fn().mockRejectedValue(new Error('redis unavailable')) };
    const controller = new SystemController(db as never, config as never, cache as never);
    await expect(controller.health()).resolves.toMatchObject({
      status: 'degraded',
      checks: { postgresql: 'connected', redis: 'unavailable' },
    });
  });
});

import { SystemController } from './system.controller';

describe('SystemController', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'runtime.trialMode' ? true : 'fake')),
  };
  const reply = () => ({ status: jest.fn().mockReturnThis() });

  it('reports liveness without probing PostgreSQL or Redis', () => {
    const db = { execute: jest.fn() };
    const cache = { ping: jest.fn() };
    const controller = new SystemController(db as never, config as never, cache as never);

    expect(controller.liveness()).toMatchObject({
      status: 'ok',
      process: 'alive',
      mode: 'trial',
    });
    expect(db.execute).not.toHaveBeenCalled();
    expect(cache.ping).not.toHaveBeenCalled();
  });

  it('reports database health only after a successful probe', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
    const cache = { ping: jest.fn().mockResolvedValue(true) };
    const controller = new SystemController(db as never, config as never, cache as never);
    const response = reply();
    await expect(controller.health(response as never)).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });
    expect(response.status).not.toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('returns readiness 503 when PostgreSQL is unavailable', async () => {
    const db = { execute: jest.fn().mockRejectedValue(new Error('database unavailable')) };
    const cache = { ping: jest.fn().mockResolvedValue(true) };
    const controller = new SystemController(db as never, config as never, cache as never);
    const response = reply();
    await expect(controller.health(response as never)).resolves.toMatchObject({
      status: 'unavailable',
      checks: { postgresql: 'unavailable', redis: 'connected' },
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('returns 200 with degraded status when only Redis is down', async () => {
    const db = { execute: jest.fn().mockResolvedValue({}) };
    const cache = { ping: jest.fn().mockRejectedValue(new Error('redis unavailable')) };
    const controller = new SystemController(db as never, config as never, cache as never);
    const response = reply();
    await expect(controller.health(response as never)).resolves.toMatchObject({
      status: 'degraded',
      checks: { postgresql: 'connected', redis: 'unavailable' },
    });
    expect(response.status).not.toHaveBeenCalled();
  });
});

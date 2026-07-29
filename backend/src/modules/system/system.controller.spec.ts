import { SystemController } from './system.controller';

describe('SystemController', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'runtime.trialMode' ? true : 'fake')),
  };

  it('reports database health only after a successful probe', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
    const controller = new SystemController(db as never, config as never);
    await expect(controller.health()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('does not mask a failed database probe', async () => {
    const db = { execute: jest.fn().mockRejectedValue(new Error('database unavailable')) };
    const controller = new SystemController(db as never, config as never);
    await expect(controller.health()).rejects.toThrow('database unavailable');
  });
});

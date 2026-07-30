import { ConfigService } from '@nestjs/config';
import { RedisClient } from './redis-client.provider';
import { RedisCacheService } from './redis-cache.service';

function config(commandTimeoutMs = 50, circuitCooldownMs = 100): ConfigService {
  const values: Record<string, number> = {
    'cache.commandTimeoutMs': commandTimeoutMs,
    'cache.circuitCooldownMs': circuitCooldownMs,
  };
  return {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('RedisCacheService', () => {
  it('round-trips cached content larger than a network frame without reloading it', async () => {
    const values = new Map<string, string>();
    const client = {
      isReady: true,
      isOpen: true,
      get: jest.fn(async (key: string) => values.get(key) ?? null),
      setEx: jest.fn(async (key: string, _ttl: number, value: string) => {
        values.set(key, value);
        return 'OK';
      }),
      incr: jest.fn(async (key: string) => {
        const next = Number(values.get(key) ?? 0) + 1;
        values.set(key, String(next));
        return next;
      }),
      ping: jest.fn(async () => 'PONG'),
      close: jest.fn(async () => undefined),
      destroy: jest.fn(),
    } as unknown as RedisClient;
    const service = new RedisCacheService(config(), client);
    const loader = jest.fn(async () => ({ content: 'x'.repeat(200 * 1024) }));

    const first = await service.remember('settings', 'large', 60, loader);
    const second = await service.remember('settings', 'large', 60, loader);

    expect(second).toEqual(first);
    expect(second.content).toHaveLength(200 * 1024);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit after a timeout so later requests fall back immediately', async () => {
    const client = {
      isReady: false,
      isOpen: false,
      connect: jest.fn(() => new Promise<never>(() => undefined)),
      destroy: jest.fn(),
    } as unknown as RedisClient;
    const service = new RedisCacheService(config(30, 1_000), client);
    const loader = jest.fn(async () => ({ siteName: 'Nehemiah' }));

    const firstStartedAt = Date.now();
    await service.remember('settings', 'public', 60, loader);
    const firstElapsed = Date.now() - firstStartedAt;
    const secondStartedAt = Date.now();
    await service.remember('settings', 'public', 60, loader);
    const secondElapsed = Date.now() - secondStartedAt;

    expect(firstElapsed).toBeLessThan(150);
    expect(secondElapsed).toBeLessThan(20);
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('allows a recovery probe after the circuit cooldown', async () => {
    let ready = false;
    const client = {
      get isReady() {
        return ready;
      },
      get isOpen() {
        return ready;
      },
      connect: jest.fn(async () => {
        throw new Error('Redis offline');
      }),
      get: jest.fn(async () => null),
      incr: jest.fn(async () => 1),
      setEx: jest.fn(async () => 'OK'),
      destroy: jest.fn(() => {
        ready = false;
      }),
    } as unknown as RedisClient;
    const service = new RedisCacheService(config(50, 30), client);

    await service.remember('settings', 'public', 60, async () => 'database');
    await new Promise((resolve) => setTimeout(resolve, 35));
    (client.connect as jest.Mock).mockImplementationOnce(async () => {
      ready = true;
      return client;
    });

    await service.remember('settings', 'public', 60, async () => 'database');

    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(client.setEx).toHaveBeenCalled();
  });
});

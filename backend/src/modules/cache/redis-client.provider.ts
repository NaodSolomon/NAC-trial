import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export type RedisClient = ReturnType<typeof createClient>;

export function createRedisClient(config: ConfigService): RedisClient {
  const client = createClient({
    socket: {
      host: config.getOrThrow<string>('cache.host'),
      port: config.getOrThrow<number>('cache.port'),
      connectTimeout: config.getOrThrow<number>('cache.connectTimeoutMs'),
      reconnectStrategy: false,
    },
  });

  // node-redis emits connection failures; registering a listener prevents an
  // optional cache outage from becoming an unhandled process error.
  client.on('error', () => undefined);
  return client;
}

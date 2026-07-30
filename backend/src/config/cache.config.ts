import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  host: process.env.REDIS_HOST ?? 'redis',
  port: Number(process.env.REDIS_PORT ?? 6379),
  connectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 250),
  commandTimeoutMs: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? 250),
  circuitCooldownMs: Number(process.env.REDIS_CIRCUIT_COOLDOWN_MS ?? 5_000),
}));

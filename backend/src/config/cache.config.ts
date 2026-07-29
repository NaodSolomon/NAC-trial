import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  host: process.env.REDIS_HOST ?? 'redis',
  port: Number(process.env.REDIS_PORT ?? 6379),
}));

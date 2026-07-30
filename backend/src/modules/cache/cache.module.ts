import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE } from './cache.interface';
import { createRedisClient, REDIS_CLIENT, RedisClient } from './redis-client.provider';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RedisClient => createRedisClient(config),
    },
    RedisCacheService,
    { provide: CACHE, useExisting: RedisCacheService },
  ],
  exports: [CACHE],
})
export class CacheModule {}

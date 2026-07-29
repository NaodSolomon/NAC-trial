import { Module } from '@nestjs/common';
import { CACHE } from './cache.interface';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [RedisCacheService, { provide: CACHE, useExisting: RedisCacheService }],
  exports: [CACHE],
})
export class CacheModule {}

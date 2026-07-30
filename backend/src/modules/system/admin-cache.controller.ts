import { Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import { CacheWarmService } from './cache-warm.service';

@Controller('admin/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminCacheController {
  constructor(
    @Inject(CACHE) private readonly cache: ApplicationCache,
    private readonly warmer: CacheWarmService,
  ) {}

  @Post('clear')
  async clear() {
    await this.cache.clear();
    return { cleared: true };
  }

  @Post('warm')
  warm() {
    return this.warmer.warm();
  }
}

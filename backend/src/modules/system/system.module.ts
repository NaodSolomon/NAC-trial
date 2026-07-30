import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminCacheController } from './admin-cache.controller';
import { NavigationModule } from '../navigation/navigation.module';
import { SettingsModule } from '../settings/settings.module';
import { CacheWarmService } from './cache-warm.service';
import { SystemController } from './system.controller';

@Module({
  imports: [AuthModule, CacheModule, NavigationModule, SettingsModule],
  controllers: [SystemController, AdminCacheController],
  providers: [CacheWarmService],
})
export class SystemModule {}

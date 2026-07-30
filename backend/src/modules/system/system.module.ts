import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminCacheController } from './admin-cache.controller';
import { NavigationModule } from '../navigation/navigation.module';
import { SettingsModule } from '../settings/settings.module';
import { CacheWarmService } from './cache-warm.service';
import { SystemController } from './system.controller';
import { AuditModule } from '../audit/audit.module';
import { CacheAdministrationService } from './cache-administration.service';

@Module({
  imports: [AuthModule, AuditModule, CacheModule, NavigationModule, SettingsModule],
  controllers: [SystemController, AdminCacheController],
  providers: [CacheAdministrationService, CacheWarmService],
})
export class SystemModule {}

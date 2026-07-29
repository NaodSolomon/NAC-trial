import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { PublicSettingsController } from './controllers/public-settings.controller';
import { SITE_SETTINGS_REPOSITORY } from './interfaces/site-settings-repository.interface';
import { DrizzleSiteSettingsRepository } from './repositories/drizzle-site-settings.repository';
import { SiteSettingsService } from './services/site-settings.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminSettingsController, PublicSettingsController],
  providers: [
    SiteSettingsService,
    RolesGuard,
    {
      provide: SITE_SETTINGS_REPOSITORY,
      useClass: DrizzleSiteSettingsRepository,
    },
  ],
})
export class SettingsModule {}

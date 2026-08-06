import { Module } from '@nestjs/common';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminCmsPagesController } from './controllers/admin-cms-pages.controller';
import { InternalPublishingJobsController } from './controllers/internal-publishing-jobs.controller';
import { PublicCmsPagesController } from './controllers/public-cms-pages.controller';
import { PublicCompositionController } from './controllers/public-composition.controller';
import { SlugCheckController } from './controllers/slug-check.controller';
import { CMS_PAGE_REPOSITORY } from './interfaces/cms-page-repository.interface';
import { SCHEDULED_PUBLISHING_LOCK } from './interfaces/scheduled-publishing-lock.interface';
import { DrizzleCmsPageRepository } from './repositories/drizzle-cms-page.repository';
import { PostgresScheduledPublishingLock } from './repositories/postgres-scheduled-publishing-lock.repository';
import { CmsPagesService } from './services/cms-pages.service';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [
    AdminCmsPagesController,
    PublicCmsPagesController,
    PublicCompositionController,
    SlugCheckController,
    InternalPublishingJobsController,
  ],
  providers: [
    CmsPagesService,
    ScheduledPublishingService,
    RolesGuard,
    InternalApiKeyGuard,
    {
      provide: CMS_PAGE_REPOSITORY,
      useClass: DrizzleCmsPageRepository,
    },
    {
      provide: SCHEDULED_PUBLISHING_LOCK,
      useClass: PostgresScheduledPublishingLock,
    },
  ],
  exports: [CmsPagesService],
})
export class CmsModule {}

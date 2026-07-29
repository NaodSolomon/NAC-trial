import { Module } from '@nestjs/common';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminCmsPagesController } from './controllers/admin-cms-pages.controller';
import { InternalPublishingJobsController } from './controllers/internal-publishing-jobs.controller';
import { PublicCmsPagesController } from './controllers/public-cms-pages.controller';
import { SlugCheckController } from './controllers/slug-check.controller';
import { CMS_PAGE_REPOSITORY } from './interfaces/cms-page-repository.interface';
import { DrizzleCmsPageRepository } from './repositories/drizzle-cms-page.repository';
import { CmsPagesService } from './services/cms-pages.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminCmsPagesController,
    PublicCmsPagesController,
    SlugCheckController,
    InternalPublishingJobsController,
  ],
  providers: [
    CmsPagesService,
    RolesGuard,
    InternalApiKeyGuard,
    {
      provide: CMS_PAGE_REPOSITORY,
      useClass: DrizzleCmsPageRepository,
    },
  ],
  exports: [CmsPagesService],
})
export class CmsModule {}

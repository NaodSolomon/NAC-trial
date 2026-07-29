import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CmsModule } from '../cms/cms.module';
import { AdminEngagementController } from './controllers/admin-engagement.controller';
import { PublicEngagementController } from './controllers/public-engagement.controller';
import { ENGAGEMENT_REPOSITORY } from './interfaces/engagement-repository.interface';
import { DrizzleEngagementRepository } from './repositories/drizzle-engagement.repository';
import { EngagementService } from './services/engagement.service';

@Module({
  imports: [AuthModule, CmsModule],
  controllers: [PublicEngagementController, AdminEngagementController],
  providers: [
    EngagementService,
    {
      provide: ENGAGEMENT_REPOSITORY,
      useClass: DrizzleEngagementRepository,
    },
  ],
})
export class EngagementModule {}

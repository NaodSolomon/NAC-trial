import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { PublicAnalyticsController } from './controllers/public-analytics.controller';
import { ANALYTICS_REPOSITORY } from './interfaces/analytics-repository.interface';
import { DrizzleAnalyticsRepository } from './repositories/drizzle-analytics.repository';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicAnalyticsController, AdminAnalyticsController],
  providers: [
    AnalyticsService,
    { provide: ANALYTICS_REPOSITORY, useClass: DrizzleAnalyticsRepository },
  ],
})
export class AnalyticsModule {}

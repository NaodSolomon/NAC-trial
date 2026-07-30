import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminEventsController } from './controllers/admin-events.controller';
import { PublicEventsController } from './controllers/public-events.controller';
import { EVENT_REPOSITORY } from './interfaces/event-repository.interface';
import { DrizzleEventRepository } from './repositories/drizzle-event.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicEventsController, AdminEventsController],
  providers: [EventsService, { provide: EVENT_REPOSITORY, useClass: DrizzleEventRepository }],
})
export class EventsModule {}

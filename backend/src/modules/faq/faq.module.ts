import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminFaqController, PublicFaqController } from './controllers/faq.controllers';
import { FAQ_REPOSITORY } from './interfaces/faq-repository.interface';
import { DrizzleFaqRepository } from './repositories/drizzle-faq.repository';
import { FaqService } from './services/faq.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicFaqController, AdminFaqController],
  providers: [
    FaqService,
    {
      provide: FAQ_REPOSITORY,
      useClass: DrizzleFaqRepository,
    },
  ],
  exports: [FAQ_REPOSITORY, FaqService],
})
export class FaqModule {}

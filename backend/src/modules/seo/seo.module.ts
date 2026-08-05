import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminSeoController } from './controllers/admin-seo.controller';
import { PublicSeoController } from './controllers/public-seo.controller';
import { SEO_REPOSITORY } from './interfaces/seo-repository.interface';
import { DrizzleSeoRepository } from './repositories/drizzle-seo.repository';
import { SeoService } from './services/seo.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicSeoController, AdminSeoController],
  providers: [
    SeoService,
    RolesGuard,
    {
      provide: SEO_REPOSITORY,
      useClass: DrizzleSeoRepository,
    },
  ],
})
export class SeoModule {}

import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminNavigationController } from './controllers/admin-navigation.controller';
import { PublicNavigationController } from './controllers/public-navigation.controller';
import { NAVIGATION_REPOSITORY } from './interfaces/navigation-repository.interface';
import { DrizzleNavigationRepository } from './repositories/drizzle-navigation.repository';
import { NavigationService } from './services/navigation.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [AdminNavigationController, PublicNavigationController],
  providers: [
    NavigationService,
    RolesGuard,
    {
      provide: NAVIGATION_REPOSITORY,
      useClass: DrizzleNavigationRepository,
    },
  ],
  exports: [NavigationService],
})
export class NavigationModule {}

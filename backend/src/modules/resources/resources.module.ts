import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminResourcesController, PublicResourcesController } from './resources.controllers';
import { RESOURCE_REPOSITORY } from './interfaces/resource-repository.interface';
import { DrizzleResourceRepository } from './repositories/drizzle-resource.repository';
import { ResourcesService } from './resources.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicResourcesController, AdminResourcesController],
  providers: [
    ResourcesService,
    {
      provide: RESOURCE_REPOSITORY,
      useClass: DrizzleResourceRepository,
    },
  ],
})
export class ResourcesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminResourcesController, PublicResourcesController } from './resources.controllers';
import { ResourcesService } from './resources.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicResourcesController, AdminResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminBlogController, PublicBlogController } from './blog.controllers';
import { BlogRepository } from './blog.repository';
import { BlogService } from './blog.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicBlogController, AdminBlogController],
  providers: [BlogRepository, BlogService],
  exports: [BlogRepository],
})
export class BlogModule {}

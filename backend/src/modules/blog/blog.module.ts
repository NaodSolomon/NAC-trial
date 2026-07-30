import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { AdminBlogController, PublicBlogController } from './blog.controllers';
import { BLOG_REPOSITORY } from './interfaces/blog-repository.interface';
import { DrizzleBlogRepository } from './repositories/drizzle-blog.repository';
import { BlogService } from './blog.service';

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [PublicBlogController, AdminBlogController],
  providers: [
    BlogService,
    {
      provide: BLOG_REPOSITORY,
      useClass: DrizzleBlogRepository,
    },
  ],
  exports: [BLOG_REPOSITORY],
})
export class BlogModule {}

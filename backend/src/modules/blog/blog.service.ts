import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import { BlogLanguageDto, BlogQueryDto, CreateBlogPostDto, UpdateBlogPostDto } from './blog.dto';
import { BLOG_REPOSITORY, BlogRepository } from './interfaces/blog-repository.interface';

@Injectable()
export class BlogService {
  constructor(
    @Inject(BLOG_REPOSITORY)
    private readonly posts: BlogRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  listPublic(query: BlogQueryDto) {
    return this.cache.remember('blog', JSON.stringify(query), 120, () =>
      this.posts.list({
        page: query.page,
        limit: query.limit,
        offset: query.offset,
        languageCode: query.languageCode,
        publicOnly: true,
      }),
    );
  }
  listAdmin(query: BlogQueryDto) {
    return this.posts.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      languageCode: query.languageCode,
      publicOnly: false,
    });
  }
  async findPublic(slug: string, query: BlogLanguageDto) {
    const post = await this.cache.remember('blog', `${query.languageCode}:${slug}`, 300, () =>
      this.posts.findPublished(slug, query.languageCode),
    );
    if (!post) throw new NotFoundException('Published blog post was not found');
    return post;
  }
  async create(dto: CreateBlogPostDto, actor: AdminPrincipal) {
    const post = await this.posts.create(
      {
        ...dto,
        title: dto.title.trim(),
        excerpt: dto.excerpt.trim(),
        content: dto.content,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
        seoImageUrl: dto.seoImageUrl?.trim() || null,
        createdBy: actor.id,
      },
      actor.id,
    );
    await this.cache.invalidate('blog');
    return post;
  }
  async update(id: string, dto: UpdateBlogPostDto, actor: AdminPrincipal) {
    if (!Object.keys(dto).length) throw new BadRequestException('At least one field is required');
    const post = await this.posts.update(id, dto, actor.id);
    if (!post) throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return post;
  }
  async publish(id: string, actor: AdminPrincipal) {
    const post = await this.posts.publish(id, actor.id);
    if (!post) throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return post;
  }
  async delete(id: string, actor: AdminPrincipal) {
    if (!(await this.posts.delete(id, actor.id)))
      throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return { deleted: true };
  }
}

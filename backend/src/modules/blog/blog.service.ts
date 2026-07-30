import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import { BlogLanguageDto, BlogQueryDto, CreateBlogPostDto, UpdateBlogPostDto } from './blog.dto';
import { BlogRepository } from './blog.repository';

@Injectable()
export class BlogService {
  constructor(
    private readonly posts: BlogRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  listPublic(query: BlogQueryDto) {
    return this.cache.remember('blog', JSON.stringify(query), 120, () =>
      this.posts.list(query.page, query.limit, query.languageCode, true),
    );
  }
  listAdmin(query: BlogQueryDto) {
    return this.posts.list(query.page, query.limit, query.languageCode);
  }
  async findPublic(slug: string, query: BlogLanguageDto) {
    const post = await this.cache.remember('blog', `${query.languageCode}:${slug}`, 300, () =>
      this.posts.findPublished(slug, query.languageCode),
    );
    if (!post) throw new NotFoundException('Published blog post was not found');
    return post;
  }
  async create(dto: CreateBlogPostDto, actor: AdminPrincipal) {
    const post = await this.posts.create({
      ...dto,
      title: dto.title.trim(),
      excerpt: dto.excerpt.trim(),
      content: dto.content,
      seoTitle: dto.seoTitle?.trim() || null,
      seoDescription: dto.seoDescription?.trim() || null,
      seoImageUrl: dto.seoImageUrl?.trim() || null,
      createdBy: actor.id,
    });
    await this.cache.invalidate('blog');
    return post;
  }
  async update(id: string, dto: UpdateBlogPostDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('At least one field is required');
    const post = await this.posts.update(id, dto);
    if (!post) throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return post;
  }
  async publish(id: string) {
    const post = await this.posts.publish(id);
    if (!post) throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return post;
  }
  async delete(id: string) {
    if (!(await this.posts.delete(id))) throw new NotFoundException('Blog post was not found');
    await this.cache.invalidate('blog');
    return { deleted: true };
  }
}

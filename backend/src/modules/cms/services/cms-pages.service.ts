import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { CmsPage } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { CmsPageQueryDto } from '../dto/cms-page-query.dto';
import { CreateCmsPageDto } from '../dto/create-cms-page.dto';
import { UpdateCmsPageDto } from '../dto/update-cms-page.dto';
import {
  CMS_PAGE_REPOSITORY,
  CmsPageRepository,
} from '../interfaces/cms-page-repository.interface';

@Injectable()
export class CmsPagesService {
  constructor(
    @Inject(CMS_PAGE_REPOSITORY)
    private readonly pages: CmsPageRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  list(query: CmsPageQueryDto): Promise<PaginatedResult<CmsPage>> {
    return this.pages.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      languageCode: query.languageCode,
      status: query.status,
    });
  }

  async findAdminPage(id: string): Promise<CmsPage> {
    const page = await this.pages.findById(id);

    if (!page) {
      throw new NotFoundException(`CMS page ${id} was not found`);
    }

    return page;
  }

  async findPublicPage(slug: string, languageCode: 'en' | 'am'): Promise<CmsPage> {
    const page = await this.cache.remember(
      'cms',
      `${languageCode}:${slug}`,
      300,
      () => this.pages.findPublished(slug, languageCode),
    );

    if (!page) {
      throw new NotFoundException('Published page was not found');
    }

    return page;
  }

  async checkSlug(
    slug: string,
    languageCode: 'en' | 'am',
  ): Promise<{ slug: string; languageCode: string; available: boolean }> {
    return {
      slug,
      languageCode,
      available: await this.pages.isSlugAvailable(slug, languageCode),
    };
  }

  async create(dto: CreateCmsPageDto, actor: AdminPrincipal): Promise<CmsPage> {
    try {
      return await this.pages.create(
        {
          slug: dto.slug,
          languageCode: dto.languageCode,
          title: dto.title.trim(),
          content: dto.content,
          metadata: dto.metadata ?? {},
          seoTitle: dto.seoTitle?.trim() || null,
          seoDescription: dto.seoDescription?.trim() || null,
          seoImageUrl: dto.seoImageUrl?.trim() || null,
          translationKey: dto.translationKey,
          createdBy: actor.id,
        },
        actor.id,
      );
    } catch (error: unknown) {
      this.rethrowUniqueViolation(error);
    }
  }

  async update(id: string, dto: UpdateCmsPageDto, actor: AdminPrincipal): Promise<CmsPage> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      const updated = await this.pages.update(
        id,
        {
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata }),
          ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle.trim() || null }),
          ...(dto.seoDescription !== undefined && {
            seoDescription: dto.seoDescription.trim() || null,
          }),
          ...(dto.seoImageUrl !== undefined && { seoImageUrl: dto.seoImageUrl.trim() || null }),
        },
        actor.id,
      );

      if (!updated) {
        throw new NotFoundException(`CMS page ${id} was not found`);
      }

      await this.cache.invalidate('cms');
      return updated;
    } catch (error: unknown) {
      this.rethrowUniqueViolation(error);
    }
  }

  async publish(id: string, actor: AdminPrincipal): Promise<CmsPage> {
    const published = await this.pages.publish(id, actor.id);

    if (!published) {
      throw new NotFoundException(`CMS page ${id} was not found`);
    }

    await this.cache.invalidate('cms');
    return published;
  }

  async schedule(id: string, scheduledAtValue: string, actor: AdminPrincipal): Promise<CmsPage> {
    const scheduledAt = new Date(scheduledAtValue);

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    const scheduled = await this.pages.schedule(id, scheduledAt, actor.id);

    if (!scheduled) {
      throw new NotFoundException(`CMS page ${id} was not found`);
    }

    await this.cache.invalidate('cms');
    return scheduled;
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    if (!(await this.pages.delete(id, actor.id))) {
      throw new NotFoundException(`CMS page ${id} was not found`);
    }
    await this.cache.invalidate('cms');

    return { message: 'CMS page deleted successfully' };
  }

  async publishScheduled(): Promise<number> {
    const count = await this.pages.publishScheduled(new Date());
    if (count) await this.cache.invalidate('cms');
    return count;
  }

  private rethrowUniqueViolation(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException(
        'This slug or translation already exists for the selected language',
      );
    }

    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    if ('code' in error && error.code === '23505') {
      return true;
    }
    return (
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause &&
      error.cause.code === '23505'
    );
  }
}

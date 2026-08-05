import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { UpdateSeoDto } from '../dto/update-seo.dto';
import { SEO_REPOSITORY, SeoRepository, SeoUpdate } from '../interfaces/seo-repository.interface';
import { SeoLanguageCode, SeoRecord, SeoResponse } from '../interfaces/seo-response.interface';

@Injectable()
export class SeoService {
  constructor(
    @Inject(SEO_REPOSITORY)
    private readonly seo: SeoRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  async findPublic(slug: string, languageCode: SeoLanguageCode): Promise<SeoResponse> {
    const record = await this.cache.remember('cms', `seo:${languageCode}:${slug}`, 300, () =>
      this.seo.findPublished(slug, languageCode),
    );

    if (!record) {
      throw new NotFoundException('Published SEO metadata was not found');
    }

    return this.toResponse(record);
  }

  async update(slug: string, dto: UpdateSeoDto, actor: AdminPrincipal): Promise<SeoResponse> {
    const changes: SeoUpdate = {
      ...(dto.title !== undefined && { seoTitle: dto.title }),
      ...(dto.description !== undefined && { seoDescription: dto.description }),
      ...(dto.keywords !== undefined && { seoKeywords: dto.keywords }),
      ...(dto.imageUrl !== undefined && { seoImageUrl: dto.imageUrl }),
    };

    if (!Object.keys(changes).length) {
      throw new BadRequestException('At least one SEO field must be provided');
    }

    const updated = await this.seo.update(slug, dto.languageCode, changes, actor.id);

    if (!updated) {
      throw new NotFoundException('CMS page was not found');
    }

    await this.cache.invalidate('cms');
    return this.toResponse(updated);
  }

  private toResponse(record: SeoRecord): SeoResponse {
    return {
      slug: record.slug,
      languageCode: record.languageCode,
      title: record.seoTitle || record.pageTitle,
      description: record.seoDescription,
      keywords: record.seoKeywords ?? [],
      imageUrl: record.seoImageUrl,
    };
  }
}

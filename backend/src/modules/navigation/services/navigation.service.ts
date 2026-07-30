import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { NavigationItem } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { ApplicationCache, CACHE, NOOP_CACHE } from '../../cache/cache.interface';
import { CreateNavigationItemDto } from '../dto/create-navigation-item.dto';
import { NavigationQueryDto } from '../dto/navigation-query.dto';
import { UpdateNavigationItemDto } from '../dto/update-navigation-item.dto';
import {
  NAVIGATION_REPOSITORY,
  NavigationRepository,
} from '../interfaces/navigation-repository.interface';

@Injectable()
export class NavigationService {
  constructor(
    @Inject(NAVIGATION_REPOSITORY)
    private readonly navigation: NavigationRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache = NOOP_CACHE,
  ) {}

  publicList(languageCode: 'en' | 'am'): Promise<NavigationItem[]> {
    return this.cache.remember('navigation', languageCode, 300, () =>
      this.navigation.publicList(languageCode),
    );
  }

  list(query: NavigationQueryDto): Promise<PaginatedResult<NavigationItem>> {
    return this.navigation.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      languageCode: query.languageCode,
    });
  }

  async create(dto: CreateNavigationItemDto, actor: AdminPrincipal): Promise<NavigationItem> {
    const created = await this.navigation.create(
      {
        label: dto.label.trim(),
        url: dto.url.trim(),
        order: dto.order,
        languageCode: dto.languageCode,
        createdBy: actor.id,
      },
      actor.id,
    );
    await this.cache.invalidate('navigation');
    return created;
  }

  async update(
    id: string,
    dto: UpdateNavigationItemDto,
    actor: AdminPrincipal,
  ): Promise<NavigationItem> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    const updated = await this.navigation.update(
      id,
      {
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.url !== undefined && { url: dto.url.trim() }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
      },
      actor.id,
    );

    if (!updated) {
      throw new NotFoundException(`Navigation item ${id} was not found`);
    }

    await this.cache.invalidate('navigation');
    return updated;
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    if (!(await this.navigation.delete(id, actor.id))) {
      throw new NotFoundException(`Navigation item ${id} was not found`);
    }
    await this.cache.invalidate('navigation');

    return { message: 'Navigation item deleted successfully' };
  }
}

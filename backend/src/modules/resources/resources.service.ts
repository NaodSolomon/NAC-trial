import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache, CACHE } from '../cache/cache.interface';
import {
  RESOURCE_REPOSITORY,
  ResourceRepository,
} from './interfaces/resource-repository.interface';
import { CreateResourceDto, ResourceQueryDto } from './resources.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resources: ResourceRepository,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  listPublic(query: ResourceQueryDto) {
    return this.cache.remember('resources', JSON.stringify(query), 120, () =>
      this.resources.list(this.criteria(query, true)),
    );
  }
  listAdmin(query: ResourceQueryDto) {
    return this.resources.list(this.criteria(query, false));
  }

  async create(dto: CreateResourceDto, actor: AdminPrincipal) {
    const resource = await this.resources.create({ ...dto, createdBy: actor.id }, actor.id);
    await this.cache.invalidate('resources');
    return resource;
  }
  async publish(id: string, actor: AdminPrincipal) {
    const resource = await this.resources.publish(id, actor.id);
    if (!resource) throw new NotFoundException('Resource was not found');
    await this.cache.invalidate('resources');
    return resource;
  }
  async download(id: string, countryHeader?: string) {
    const resource = await this.resources.recordPublishedDownload(
      id,
      this.normalizeCountry(countryHeader),
    );
    if (!resource) throw new NotFoundException('Published resource was not found');
    await this.cache.invalidate('resources');
    return resource;
  }

  private normalizeCountry(value?: string): string | null {
    const country = value?.trim().toUpperCase();
    return country && /^[A-Z]{2}$/.test(country) && country !== 'XX' && country !== 'T1'
      ? country
      : null;
  }
  async delete(id: string, actor: AdminPrincipal) {
    if (!(await this.resources.delete(id, actor.id)))
      throw new NotFoundException('Resource was not found');
    await this.cache.invalidate('resources');
    return { deleted: true };
  }

  private criteria(query: ResourceQueryDto, publicOnly: boolean) {
    return {
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      languageCode: query.languageCode,
      publicOnly,
    };
  }
}

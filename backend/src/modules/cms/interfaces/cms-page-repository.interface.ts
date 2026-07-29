import { PaginatedResult } from '../../../common/types/api-response.type';
import { CmsPage, NewCmsPage } from '../../../database/schema';

export const CMS_PAGE_REPOSITORY = Symbol('CMS_PAGE_REPOSITORY');

export interface CmsPageListCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  languageCode?: 'en' | 'am';
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
}

export interface CmsPageRepository {
  list(criteria: CmsPageListCriteria): Promise<PaginatedResult<CmsPage>>;
  findById(id: string): Promise<CmsPage | null>;
  findPublished(slug: string, languageCode: 'en' | 'am'): Promise<CmsPage | null>;
  isSlugAvailable(slug: string, languageCode: 'en' | 'am'): Promise<boolean>;
  create(data: NewCmsPage, actorId: string): Promise<CmsPage>;
  update(id: string, data: Partial<NewCmsPage>, actorId: string): Promise<CmsPage | null>;
  publish(id: string, actorId: string): Promise<CmsPage | null>;
  schedule(id: string, scheduledAt: Date, actorId: string): Promise<CmsPage | null>;
  delete(id: string, actorId: string): Promise<boolean>;
  publishScheduled(now: Date): Promise<number>;
}

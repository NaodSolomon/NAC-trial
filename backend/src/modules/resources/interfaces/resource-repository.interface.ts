import { PaginatedResult } from '../../../common/types/api-response.type';
import { NewResource, Resource } from '../../../database/schema';

export const RESOURCE_REPOSITORY = Symbol('RESOURCE_REPOSITORY');

export interface ResourceListCriteria {
  page: number;
  limit: number;
  offset: number;
  languageCode?: 'en' | 'am';
  publicOnly: boolean;
}

export interface ResourceDownload {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  downloadCount: number;
}

export interface ResourceRepository {
  list(criteria: ResourceListCriteria): Promise<PaginatedResult<Resource>>;
  create(data: NewResource, actorId: string): Promise<Resource>;
  publish(id: string, actorId: string): Promise<Resource | null>;
  incrementPublishedDownload(id: string): Promise<ResourceDownload | null>;
  delete(id: string, actorId: string): Promise<boolean>;
}

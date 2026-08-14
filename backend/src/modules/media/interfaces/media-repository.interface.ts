import { PaginatedResult } from '../../../common/types/api-response.type';
import {
  MediaAsset,
  MediaTranslation,
  NewMediaAsset,
  NewMediaTranslation,
} from '../../../database/schema';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export type MediaAssetView = MediaAsset & {
  translations: MediaTranslation[];
};

export interface MediaListCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  type?: MediaAsset['type'];
  search?: string;
}

export interface MediaRepository {
  list(criteria: MediaListCriteria): Promise<PaginatedResult<MediaAssetView>>;
  create(
    asset: NewMediaAsset,
    translation: Omit<NewMediaTranslation, 'mediaId'> | null,
    actorId: string,
  ): Promise<MediaAssetView>;
  findById(id: string): Promise<MediaAsset | null>;
  deleteAndEnqueueStorageCleanup(id: string, actorId: string): Promise<boolean>;
}

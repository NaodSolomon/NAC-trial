import { GalleryItem, MediaAsset, NewGalleryItem } from '../../../database/schema';

export const GALLERY_REPOSITORY = Symbol('GALLERY_REPOSITORY');

export type GalleryItemView = Omit<GalleryItem, 'createdBy'> & {
  mediaUrl: string;
  type: MediaAsset['type'];
};

export interface GalleryCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
  languageCode: 'en' | 'am';
  type?: 'IMAGE' | 'VIDEO';
}

export interface GalleryRepository {
  list(criteria: GalleryCriteria): Promise<unknown>;
  create(data: NewGalleryItem, actorId: string): Promise<GalleryItemView>;
  findById(id: string): Promise<GalleryItemView | null>;
  update(
    id: string,
    data: Partial<Pick<NewGalleryItem, 'title' | 'altText'>>,
    actorId: string,
  ): Promise<GalleryItemView | null>;
  deleteAndEnqueueStorageCleanup(id: string, actorId: string): Promise<boolean>;
}

import type { Language } from '@/lib/i18n';

export type GalleryMediaType = 'IMAGE' | 'VIDEO';
export type GalleryFilter = 'all' | 'image' | 'video';
export type GalleryLayout = 'grid' | 'masonry';

export interface PublicGalleryItem {
  id: string;
  mediaId: string;
  title: string;
  altText: string;
  languageCode: Language;
  mediaUrl: string;
  imageUrl: string;
  type: GalleryMediaType;
  createdAt: string;
  updatedAt: string;
}

export interface PublicGalleryPage {
  data: PublicGalleryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

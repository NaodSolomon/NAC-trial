import 'server-only';

import { createServerApiClient } from '@/lib/api/server-client';
import type { Language } from '@/lib/i18n';
import { publicGalleryPageSchema } from './gallery.schemas';
import type { GalleryFilter, PublicGalleryPage } from './gallery.types';

const client = createServerApiClient();
export const galleryPageSize = 12;

export async function loadPublicGallery(
  language: Language,
  page: number,
  filter: GalleryFilter,
): Promise<PublicGalleryPage> {
  const type = filter === 'all' ? '' : `&type=${filter.toUpperCase()}`;
  const value = await client.get(
    `/public/gallery?languageCode=${language}&sortOrder=desc&page=${page}&limit=${galleryPageSize}${type}`,
    galleryCache(120, [`gallery:${language}:${filter}:${page}`]),
  );
  const parsed = publicGalleryPageSchema.parse(value);
  return {
    ...parsed,
    data: parsed.data.map((item) => ({
      ...item,
      imageUrl: item.type === 'IMAGE' ? optimizedImageUrl(item.mediaUrl) : item.mediaUrl,
    })),
  };
}

function optimizedImageUrl(publicUrl: string): string {
  const publicOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  const internalOrigin = process.env.MEDIA_IMAGE_ORIGIN;
  if (!publicOrigin || !internalOrigin) return publicUrl;
  try {
    const publicBase = new URL(publicOrigin);
    const source = new URL(publicUrl);
    if (source.origin !== publicBase.origin) return publicUrl;
    return new URL(source.pathname + source.search, internalOrigin).toString();
  } catch {
    return publicUrl;
  }
}

function galleryCache(revalidate: number, tags: string[]) {
  return process.env.NODE_ENV === 'development'
    ? { cache: 'no-store' as const }
    : { next: { revalidate, tags } };
}

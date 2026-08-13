import type { GalleryFilter, GalleryLayout } from './gallery.types';

export function approvedMediaOrigins(): string[] {
  const storageOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  if (!storageOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_STORAGE_ORIGIN is required in production');
  }

  const values = [
    storageOrigin ?? 'http://localhost:9000',
    ...(process.env.NEXT_PUBLIC_MEDIA_HOSTS ?? '').split(','),
  ];
  return [
    ...new Set(values.map(normalizeOrigin).filter((value): value is string => Boolean(value))),
  ];
}

export function isApprovedMediaUrl(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) && approvedMediaOrigins().includes(url.origin)
    );
  } catch {
    return false;
  }
}

export function parseGalleryPage(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  return Math.min(Number(value), 10_000);
}

export function parseGalleryFilter(value: string | undefined): GalleryFilter {
  return value === 'image' || value === 'video' ? value : 'all';
}

export function parseGalleryLayout(value: string | undefined): GalleryLayout {
  return value === 'masonry' ? 'masonry' : 'grid';
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

import { afterEach, describe, expect, it } from 'vitest';
import {
  approvedMediaOrigins,
  isApprovedMediaUrl,
  parseGalleryFilter,
  parseGalleryLayout,
  parseGalleryPage,
} from './gallery.utils';

const originalStorageOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
const originalMediaHosts = process.env.NEXT_PUBLIC_MEDIA_HOSTS;

afterEach(() => {
  process.env.NEXT_PUBLIC_STORAGE_ORIGIN = originalStorageOrigin;
  process.env.NEXT_PUBLIC_MEDIA_HOSTS = originalMediaHosts;
});

describe('gallery query parsing', () => {
  it('bounds page numbers and rejects malformed values', () => {
    expect(parseGalleryPage('2')).toBe(2);
    expect(parseGalleryPage('99999')).toBe(10_000);
    expect(parseGalleryPage('0')).toBe(1);
    expect(parseGalleryPage('2.5')).toBe(1);
  });

  it('uses safe defaults for filters and layouts', () => {
    expect(parseGalleryFilter('video')).toBe('video');
    expect(parseGalleryFilter('private')).toBe('all');
    expect(parseGalleryLayout('masonry')).toBe('masonry');
    expect(parseGalleryLayout('unknown')).toBe('grid');
  });
});

describe('gallery media allowlist', () => {
  it('normalizes and deduplicates configured origins', () => {
    process.env.NEXT_PUBLIC_STORAGE_ORIGIN = 'http://localhost:9000/media';
    process.env.NEXT_PUBLIC_MEDIA_HOSTS =
      'https://media.example.org, https://media.example.org/gallery';

    expect(approvedMediaOrigins()).toEqual(['http://localhost:9000', 'https://media.example.org']);
  });

  it('allows only local paths or exact configured HTTP origins', () => {
    process.env.NEXT_PUBLIC_STORAGE_ORIGIN = 'https://media.example.org';

    expect(isApprovedMediaUrl('/images/local.jpg')).toBe(true);
    expect(isApprovedMediaUrl('https://media.example.org/gallery/photo.jpg')).toBe(true);
    expect(isApprovedMediaUrl('//attacker.test/photo.jpg')).toBe(false);
    expect(isApprovedMediaUrl('https://media.example.org.attacker.test/photo.jpg')).toBe(false);
    expect(isApprovedMediaUrl('data:image/svg+xml,test')).toBe(false);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { publicGalleryItemSchema, publicGalleryPageSchema } from './gallery.schemas';

const originalStorageOrigin = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
const originalMediaHosts = process.env.NEXT_PUBLIC_MEDIA_HOSTS;

const item = {
  id: '00000000-0000-4000-8000-000000000601',
  mediaId: '00000000-0000-4000-8000-000000000701',
  title: 'Community moment',
  altText: 'Children and caregivers participating in an inclusive activity',
  languageCode: 'en',
  mediaUrl: 'https://media.example.org/gallery/community.webp',
  type: 'IMAGE',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

afterEach(() => {
  process.env.NEXT_PUBLIC_STORAGE_ORIGIN = originalStorageOrigin;
  process.env.NEXT_PUBLIC_MEDIA_HOSTS = originalMediaHosts;
});

describe('public gallery contract', () => {
  it('parses paginated image and video records from approved hosts', () => {
    process.env.NEXT_PUBLIC_STORAGE_ORIGIN = 'https://media.example.org';

    const page = publicGalleryPageSchema.parse({
      data: [item, { ...item, id: '00000000-0000-4000-8000-000000000602', type: 'VIDEO' }],
      meta: { total: 2, page: 1, limit: 12, totalPages: 1 },
    });

    expect(page.data.map(({ type }) => type)).toEqual(['IMAGE', 'VIDEO']);
  });

  it('requires meaningful alternative text for every public record', () => {
    process.env.NEXT_PUBLIC_STORAGE_ORIGIN = 'https://media.example.org';

    expect(() => publicGalleryItemSchema.parse({ ...item, altText: ' ' })).toThrow();
  });

  it('rejects media URLs outside the exact approved origin allowlist', () => {
    process.env.NEXT_PUBLIC_STORAGE_ORIGIN = 'https://media.example.org';

    expect(() =>
      publicGalleryItemSchema.parse({
        ...item,
        mediaUrl: 'https://media.example.org.attacker.test/gallery/private.webp',
      }),
    ).toThrow();
  });
});

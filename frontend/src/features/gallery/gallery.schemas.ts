import { z } from 'zod';
import { isApprovedMediaUrl } from './gallery.utils';

export const publicGalleryItemSchema = z.object({
  id: z.string().uuid(),
  mediaId: z.string().uuid(),
  title: z.string().min(2).max(255),
  altText: z.string().trim().min(2).max(500),
  languageCode: z.enum(['en', 'am']),
  mediaUrl: z.string().url().refine(isApprovedMediaUrl, 'Media URL is not from an approved host'),
  type: z.enum(['IMAGE', 'VIDEO']),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

export const publicGalleryPageSchema = z.object({
  data: z.array(publicGalleryItemSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

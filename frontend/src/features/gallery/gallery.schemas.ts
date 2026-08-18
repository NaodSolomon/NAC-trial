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

export const galleryMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
] as const;
export const maxGalleryFileSize = 10_485_760;
export const galleryUploadHint = 'Up to 10 MB. JPEG, PNG, GIF, WebP, MP4 or WebM.';

export function validateGalleryFile(file: File | null): string | null {
  if (!file) return 'Choose an image or video.';
  if (file.size > maxGalleryFileSize) return 'The gallery file must be 10 MB or smaller.';
  if (!(galleryMimeTypes as readonly string[]).includes(file.type))
    return 'Gallery accepts JPEG, PNG, GIF, WebP, MP4, and WebM files.';
  return null;
}

export const galleryEditorSchema = z.object({
  title: z.string().trim().min(2, 'The title must contain at least 2 characters.').max(255),
  altText: z
    .string()
    .trim()
    .min(2, 'Alternative text must contain at least 2 characters.')
    .max(500),
});

export const galleryUploadSchema = galleryEditorSchema.extend({
  file: z.custom<FileList>().superRefine((list, ctx) => {
    const message = validateGalleryFile(list?.[0] ?? null);
    if (message) ctx.addIssue({ code: 'custom', message });
  }),
});

export type GalleryEditorValues = z.infer<typeof galleryEditorSchema>;
export type GalleryUploadValues = z.infer<typeof galleryUploadSchema>;
export type GalleryApiItem = z.infer<typeof publicGalleryItemSchema>;

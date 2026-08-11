import { z } from 'zod';

export const allowedMediaMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
] as const;
export const maxMediaFileSize = 10_485_760;

const mediaTranslationSchema = z.object({
  id: z.string().uuid(),
  mediaId: z.string().uuid(),
  languageCode: z.enum(['en', 'am']),
  altText: z.string(),
  caption: z.string().nullable(),
});
export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  objectKey: z.string(),
  publicUrl: z.string().url(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.coerce.number().nonnegative(),
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
  uploadedBy: z.string().uuid(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  translations: z.array(mediaTranslationSchema).default([]),
});
export const mediaListSchema = z.object({
  data: z.array(mediaAssetSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export function validateMediaFile(file: File | null): string | null {
  if (!file) return 'Choose a file to upload.';
  if (file.size > maxMediaFileSize) return 'The file must be 10 MB or smaller.';
  if (!(allowedMediaMimeTypes as readonly string[]).includes(file.type))
    return 'Allowed files: JPEG, PNG, GIF, WebP, MP4, WebM, and PDF.';
  return null;
}

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

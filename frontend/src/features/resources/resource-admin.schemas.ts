import { z } from 'zod';

export const resourceMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
] as const;
export const adminResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.string(),
  languageCode: z.enum(['en', 'am']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  downloadCount: z.number().int().nonnegative(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});
export const adminResourceListSchema = z.object({
  data: z.array(adminResourceSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const resourceEditorSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  fileUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => /^https?:\/\/\S+$/i.test(value),
      'Use the public URL produced by the media library.',
    ),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(resourceMimeTypes),
  languageCode: z.enum(['en', 'am']),
});
export type AdminResource = z.infer<typeof adminResourceSchema>;
export type ResourceEditorValues = z.infer<typeof resourceEditorSchema>;
export const emptyResource: ResourceEditorValues = {
  title: '',
  description: '',
  fileUrl: '',
  fileName: '',
  mimeType: 'application/pdf',
  languageCode: 'en',
};

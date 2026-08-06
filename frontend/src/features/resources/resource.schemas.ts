import { z } from 'zod';

const publicResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().min(1),
  languageCode: z.enum(['en', 'am']),
  status: z.literal('PUBLISHED'),
  downloadCount: z.number().int().nonnegative(),
});

export const publicResourceListSchema = z.object({
  data: z.array(publicResourceSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const resourceDownloadSchema = z.object({
  id: z.string().uuid(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  downloadCount: z.number().int().nonnegative(),
});

import { z } from 'zod';

export const publishedBlogPostSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  languageCode: z.enum(['en', 'am']),
  title: z.string().min(1).max(255),
  excerpt: z.string().min(1).max(500),
  content: z.string().min(1),
  status: z.literal('PUBLISHED'),
  seoTitle: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  seoDescription: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  seoImageUrl: z
    .string()
    .url()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  publishedAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

export const blogPageSchema = z.object({
  data: z.array(publishedBlogPostSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

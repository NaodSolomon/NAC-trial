import { z } from 'zod';

export const adminBlogPostSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  languageCode: z.enum(['en', 'am']),
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  seoImageUrl: z.string().nullable(),
  createdBy: z.string().uuid(),
  publishedAt: z.coerce
    .date()
    .nullable()
    .transform((value) => value?.toISOString() ?? null),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});
export const adminBlogListSchema = z.object({
  data: z.array(adminBlogPostSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
const optionalHttps = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https:\/\/\S+$/i.test(value), 'SEO image must use HTTPS.');
export const blogEditorSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase URL slug.'),
  languageCode: z.enum(['en', 'am']),
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().min(1).max(200_000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(160),
  seoImageUrl: optionalHttps,
});
export type AdminBlogPost = z.infer<typeof adminBlogPostSchema>;
export type BlogEditorValues = z.infer<typeof blogEditorSchema>;
export const emptyBlogEditor: BlogEditorValues = {
  slug: '',
  languageCode: 'en',
  title: '',
  excerpt: '',
  content: '',
  seoTitle: '',
  seoDescription: '',
  seoImageUrl: '',
};
export function blogEditorFromPost(post: AdminBlogPost): BlogEditorValues {
  return {
    slug: post.slug,
    languageCode: post.languageCode,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    seoTitle: post.seoTitle ?? '',
    seoDescription: post.seoDescription ?? '',
    seoImageUrl: post.seoImageUrl ?? '',
  };
}

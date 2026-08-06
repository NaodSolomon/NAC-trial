import { z } from 'zod';

export const publishedCmsPageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  languageCode: z.enum(['en', 'am']),
  title: z.string().min(1).max(255),
  content: z.string(),
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
});

export const faqCompositionSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string(),
  items: z.array(
    z.object({
      question: z.string().min(1).max(500),
      answer: z.string().min(1).max(5_000),
    }),
  ),
});

export type FaqComposition = z.infer<typeof faqCompositionSchema>;

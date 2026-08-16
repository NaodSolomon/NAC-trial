import { z } from 'zod';

export const faqItemSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5_000),
  category: z.string().max(120).nullable(),
});

export const faqCollectionSchema = z.object({
  languageCode: z.enum(['en', 'am']),
  items: z.array(faqItemSchema),
});

export const faqCategoriesSchema = z.array(z.string().min(1).max(120));

export const adminFaqSchema = faqItemSchema.extend({
  languageCode: z.enum(['en', 'am']),
  translationKey: z.string().min(1).max(180),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']),
  sortOrder: z.number().int().nonnegative(),
});

export const adminFaqListSchema = z.object({
  data: z.array(adminFaqSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const faqFormSchema = z.object({
  translationKey: z
    .string()
    .trim()
    .min(2, 'Provide a translation key of at least 2 characters.')
    .max(180)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only.'),
  languageCode: z.enum(['en', 'am']),
  question: z.string().trim().min(2, 'A question is required.').max(500),
  answer: z.string().trim().min(1, 'An answer is required.').max(5_000),
  category: z.string().trim().max(120).optional(),
});

export type FaqItem = z.infer<typeof faqItemSchema>;
export type FaqCollection = z.infer<typeof faqCollectionSchema>;
export type AdminFaq = z.infer<typeof adminFaqSchema>;
export type AdminFaqList = z.infer<typeof adminFaqListSchema>;
export type FaqFormValues = z.infer<typeof faqFormSchema>;

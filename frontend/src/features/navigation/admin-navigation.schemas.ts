import { z } from 'zod';

export const navigationLanguageSchema = z.enum(['en', 'am']);
export const navigationItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(100),
  url: z.string().min(1).max(500),
  order: z.number().int().min(0).max(10_000),
  languageCode: navigationLanguageSchema,
  isVisible: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

export const navigationListSchema = z.object({
  data: z.array(navigationItemSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const navigationEditorSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(100),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/i.test(value),
      'Use an internal /path or an HTTPS URL.',
    ),
});

export type NavigationLanguage = z.infer<typeof navigationLanguageSchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type NavigationEditorValues = z.infer<typeof navigationEditorSchema>;

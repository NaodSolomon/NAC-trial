import { z } from 'zod';

export const cmsStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']);
export const cmsLanguageSchema = z.enum(['en', 'am']);

export const adminCmsPageSchema = z.object({
  id: z.string().uuid(),
  translationKey: z.string().uuid(),
  slug: z.string().min(2).max(180),
  languageCode: cmsLanguageSchema,
  title: z.string().min(1).max(255),
  content: z.string().max(200_000),
  status: cmsStatusSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  seoImageUrl: z.string().nullable().default(null),
  seoKeywords: z.array(z.string()).default([]),
  createdBy: z.string().uuid(),
  scheduledAt: z.coerce
    .date()
    .nullable()
    .transform((value) => value?.toISOString() ?? null),
  publishedAt: z.coerce
    .date()
    .nullable()
    .transform((value) => value?.toISOString() ?? null),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});

export const adminCmsPageListSchema = z.object({
  data: z.array(adminCmsPageSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const slugAvailabilitySchema = z.object({
  slug: z.string(),
  languageCode: cmsLanguageSchema,
  available: z.boolean(),
});

const homepageServiceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
});

export const cmsEditorSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    languageCode: cmsLanguageSchema,
    title: z.string().trim().min(1).max(255),
    content: z.string().min(1).max(200_000),
    translationKey: z.string().uuid().or(z.literal('')),
    contentType: z.enum(['generic', 'homepage', 'faq']),
    homepage: z.object({
      heroHeading: z.string().trim().max(180),
      heroBody: z.string().trim().max(1_000),
      primaryLabel: z.string().trim().max(80),
      primaryHref: z.string().trim().max(2_048),
      servicesHeading: z.string().trim().max(180),
      services: z.array(homepageServiceSchema).max(12),
      ctaHeading: z.string().trim().max(180),
      ctaBody: z.string().trim().max(1_000),
      ctaLabel: z.string().trim().max(80),
      ctaHref: z.string().trim().max(2_048),
    }),
    faqs: z
      .array(
        z.object({
          question: z.string().trim().min(2).max(300),
          answer: z.string().trim().min(1).max(2_000),
        }),
      )
      .max(50),
  })
  .superRefine((value, context) => {
    if (value.contentType === 'homepage') {
      const homepage = value.homepage;
      if (!homepage.heroHeading)
        issue(context, ['homepage', 'heroHeading'], 'Hero heading is required.');
      if (!homepage.servicesHeading)
        issue(context, ['homepage', 'servicesHeading'], 'Services heading is required.');
      if (!homepage.services.length)
        issue(context, ['homepage', 'services'], 'Add at least one service.');
      if (!homepage.ctaHeading)
        issue(context, ['homepage', 'ctaHeading'], 'Call-to-action heading is required.');
      if (!homepage.ctaLabel)
        issue(context, ['homepage', 'ctaLabel'], 'Call-to-action label is required.');
      if (!homepage.ctaHref)
        issue(context, ['homepage', 'ctaHref'], 'Call-to-action link is required.');
    }
    if (value.contentType === 'faq' && !value.faqs.length) {
      issue(context, ['faqs'], 'Add at least one FAQ item.');
    }
  });

function issue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: 'custom', path, message });
}

export type AdminCmsPage = z.infer<typeof adminCmsPageSchema>;
export type CmsEditorValues = z.infer<typeof cmsEditorSchema>;
export type CmsStatus = z.infer<typeof cmsStatusSchema>;

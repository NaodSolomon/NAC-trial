import { z } from 'zod';

export const publishedCmsPageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  languageCode: z.enum(['en', 'am']),
  title: z.string().min(1).max(255),
  content: z.string(),
  status: z.literal('PUBLISHED'),
  metadata: z.record(z.string(), z.unknown()).default({}),
  // Derived accessor lives in cms.utils to keep unknown-metadata reads in one place.
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

const contentSectionSchema = z.object({
  heading: z.string().min(1).max(180),
  body: z.string().min(1).max(5_000),
});

export const aboutMetadataSchema = z.object({
  about: z.object({
    mission: contentSectionSchema,
    history: contentSectionSchema,
    services: z
      .array(
        z.object({
          title: z.string().min(1).max(120),
          body: z.string().min(1).max(500),
        }),
      )
      .min(1)
      .max(12),
  }),
});

export const teamMetadataSchema = z.object({
  contentApproved: z.literal(true),
  teamMembers: z
    .array(
      z.object({
        name: z.string().min(1).max(150),
        role: z.string().min(1).max(150),
        biography: z.string().min(1).max(2_000),
      }),
    )
    .min(1)
    .max(50),
});

export function cmsBannerImage(metadata: Record<string, unknown>): string | null {
  const value = metadata.bannerImageUrl;
  return typeof value === 'string' && value ? value : null;
}

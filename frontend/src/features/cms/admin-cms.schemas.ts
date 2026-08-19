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
      .min(2, 'The slug must contain at least 2 characters.')
      .max(180, 'The slug cannot exceed 180 characters.')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase letters, numbers and single hyphens, for example family-support.',
      ),
    languageCode: cmsLanguageSchema,
    title: z.string().trim().min(1, 'A title is required.').max(255),
    content: z.string().min(1, 'Page content is required.').max(200_000),
    // A union would report only "Invalid input" when a non-empty value is malformed,
    // so the optional case is expressed as a refinement that carries its own message.
    translationKey: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || z.string().uuid().safeParse(value).success,
        'Enter a valid UUID, or leave this blank to generate one.',
      ),
    contentType: z.enum(['generic', 'homepage', 'about', 'volunteer', 'team', 'contact']),
    homepage: z.object({
      heroHeading: z.string().trim().max(180),
      heroBody: z.string().trim().max(1_000),
      primaryLabel: z.string().trim().max(80),
      primaryHref: z.string().trim().max(2_048),
      secondaryLabel: z.string().trim().max(80),
      secondaryHref: z.string().trim().max(2_048),
      imageUrl: z.string().trim().max(2_048),
      servicesHeading: z.string().trim().max(180),
      services: z.array(homepageServiceSchema).max(12),
      locationHeading: z.string().trim().max(180),
      locationBody: z.string().trim().max(1_000),
      mapEmbedUrl: z.string().trim().max(2_048),
      ctaHeading: z.string().trim().max(180),
      ctaBody: z.string().trim().max(1_000),
      ctaLabel: z.string().trim().max(80),
      ctaHref: z.string().trim().max(2_048),
    }),
    about: z.object({
      contentApproved: z.boolean(),
      missionHeading: z.string().trim().max(180),
      missionBody: z.string().trim().max(5_000),
      historyHeading: z.string().trim().max(180),
      historyBody: z.string().trim().max(5_000),
      services: z.array(homepageServiceSchema).max(12),
    }),
    volunteerRoles: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(150),
          summary: z.string().trim().min(1).max(1_000),
          commitment: z.string().trim().max(300),
        }),
      )
      .max(20),
    teamMembers: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(150),
          role: z.string().trim().min(1).max(150),
          biography: z.string().trim().min(1).max(2_000),
        }),
      )
      .max(50),
    teamContentApproved: z.boolean(),
    contactMapEmbedUrl: z.string().trim().max(2_048),
    bannerImageUrl: z.string().trim().max(2_048),
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
      if (!homepage.locationHeading)
        issue(context, ['homepage', 'locationHeading'], 'Location heading is required.');
      if (!isApprovedMapUrl(homepage.mapEmbedUrl))
        issue(context, ['homepage', 'mapEmbedUrl'], 'Use an approved HTTPS Google Maps embed URL.');
      if (!homepage.ctaHeading)
        issue(context, ['homepage', 'ctaHeading'], 'Call-to-action heading is required.');
      if (!homepage.ctaLabel)
        issue(context, ['homepage', 'ctaLabel'], 'Call-to-action label is required.');
      if (!homepage.ctaHref)
        issue(context, ['homepage', 'ctaHref'], 'Call-to-action link is required.');
    }
    if (value.contentType === 'about') {
      if (!value.about.missionHeading || !value.about.missionBody)
        issue(context, ['about', 'missionBody'], 'Mission heading and content are required.');
      if (!value.about.historyHeading || !value.about.historyBody)
        issue(context, ['about', 'historyBody'], 'History heading and content are required.');
      if (!value.about.services.length)
        issue(context, ['about', 'services'], 'Add at least one service.');
    }
    if (value.contentType === 'volunteer' && !value.volunteerRoles.length) {
      issue(context, ['volunteerRoles'], 'Add at least one structured volunteer role.');
    }
    if (value.contentType === 'team' && !value.teamMembers.length) {
      issue(context, ['teamMembers'], 'Add at least one approved team biography.');
    }
    if (value.contentType === 'contact' && !isApprovedMapUrl(value.contactMapEmbedUrl)) {
      issue(context, ['contactMapEmbedUrl'], 'Use an approved HTTPS Google Maps embed URL.');
    }
    const secondary = value.homepage;
    if (
      value.contentType === 'homepage' &&
      Boolean(secondary.secondaryLabel) !== Boolean(secondary.secondaryHref)
    ) {
      issue(
        context,
        ['homepage', secondary.secondaryLabel ? 'secondaryHref' : 'secondaryLabel'],
        'Provide both a label and a link for the second button, or neither.',
      );
    }
  });

function issue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: 'custom', path, message });
}

function isApprovedMapUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'google.com' || url.hostname.endsWith('.google.com'))
    );
  } catch {
    return false;
  }
}

export type AdminCmsPage = z.infer<typeof adminCmsPageSchema>;
export type CmsEditorValues = z.infer<typeof cmsEditorSchema>;
export type CmsStatus = z.infer<typeof cmsStatusSchema>;

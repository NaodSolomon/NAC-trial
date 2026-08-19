import { z } from 'zod';

const safeHref = z
  .string()
  .max(500)
  .refine(
    (value) => (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//i.test(value),
    'Action URL must be an internal path or HTTPS URL.',
  );

const actionSchema = z.object({ label: z.string().min(1).max(100), href: safeHref });

const heroSchema = z.object({
  type: z.literal('hero'),
  heading: z.string().min(1).max(300),
  body: z.string().min(1).max(2_000),
  imageUrl: z.string().url().optional(),
  primaryAction: actionSchema,
  secondaryAction: actionSchema.optional(),
});

const servicesSchema = z.object({
  type: z.literal('services'),
  heading: z.string().min(1).max(200),
  items: z
    .array(z.object({ title: z.string().min(1).max(150), body: z.string().min(1).max(1_000) }))
    .min(1)
    .max(6),
});

const callToActionSchema = z.object({
  type: z.literal('callToAction'),
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(2_000),
  action: actionSchema,
});

const locationSchema = z.object({
  type: z.literal('location'),
  heading: z.string().min(1).max(200),
  body: z.string().max(2_000).optional(),
  mapEmbedUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        (url.hostname === 'google.com' || url.hostname.endsWith('.google.com'))
      );
    }, 'Map URL must use an approved Google HTTPS origin.'),
});

export const homeCompositionSchema = z.object({
  title: z.string().min(1),
  body: z.string(),
  sections: z.array(
    z.discriminatedUnion('type', [heroSchema, servicesSchema, locationSchema, callToActionSchema]),
  ),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().nullable().catch(null),
    imageUrl: z.string().url().nullable().catch(null),
  }),
});

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const blogListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      excerpt: z.string(),
      seoImageUrl: z.string().nullable().optional(),
      publishedAt: z.string().nullable().or(z.date()).optional(),
    }),
  ),
  meta: paginationMetaSchema,
});

export const eventListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      description: z.string(),
      startDate: z.string().or(z.date()),
      location: z.string(),
      imageUrl: z.string().url().nullable().catch(null),
    }),
  ),
  meta: paginationMetaSchema,
});

export const galleryListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      altText: z.string(),
      mediaUrl: z.string().url(),
      type: z.literal('IMAGE'),
    }),
  ),
  meta: paginationMetaSchema,
});

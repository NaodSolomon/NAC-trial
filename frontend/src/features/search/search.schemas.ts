import { z } from 'zod';

export const publicSearchSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      type: z.enum(['page', 'event', 'blog']),
      slug: z.string().min(1).max(180),
      title: z.string().min(1).max(255),
      summary: z.string().nullable(),
      languageCode: z.enum(['en', 'am']),
      date: z.coerce
        .date()
        .transform((value) => value.toISOString())
        .nullable(),
      url: z.string(),
    }),
  ),
});

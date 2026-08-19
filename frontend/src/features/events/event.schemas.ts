import { z } from 'zod';

export const publicEventSchema = z
  .object({
    imageUrl: z.string().url().nullable().catch(null),
    id: z.string().uuid(),
    slug: z.string().min(1).max(180),
    title: z.string().min(1).max(255),
    description: z.string().min(1).max(10_000),
    startDate: z.coerce.date().transform((value) => value.toISOString()),
    endDate: z.coerce.date().transform((value) => value.toISOString()),
    location: z.string().min(1).max(500),
    rsvpEnabled: z.boolean(),
    status: z.literal('PUBLISHED'),
    languageCode: z.enum(['en', 'am']),
  })
  .refine((event) => Date.parse(event.endDate) > Date.parse(event.startDate), {
    message: 'Event end date must be after its start date',
  });

export const publicEventPageSchema = z.object({
  data: z.array(publicEventSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const rsvpInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(255),
  attendees: z.coerce.number().int().min(1, 'Choose at least one attendee.').max(20),
});

export const rsvpConfirmationSchema = z.object({ status: z.literal('confirmed') });

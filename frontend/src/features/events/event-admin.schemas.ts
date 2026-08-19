import { z } from 'zod';

export const adminEventSchema = z.object({
  id: z.string().uuid(),
  translationKey: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: z.coerce.date().transform((value) => value.toISOString()),
  endDate: z.coerce.date().transform((value) => value.toISOString()),
  location: z.string(),
  imageUrl: z.string().nullable().default(null),
  rsvpEnabled: z.boolean(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  languageCode: z.enum(['en', 'am']),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
  updatedAt: z.coerce.date().transform((value) => value.toISOString()),
});
export const adminEventListSchema = z.object({
  data: z.array(adminEventSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const eventEditorSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(2).max(255),
    description: z.string().trim().min(2).max(10_000),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    location: z.string().trim().min(2).max(500),
    imageUrl: z.string().max(2_048),
    rsvpEnabled: z.boolean(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    languageCode: z.enum(['en', 'am']),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });
export const eventRsvpSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  attendees: z.number().int(),
  status: z.enum(['CONFIRMED', 'CANCELLED']),
  createdAt: z.coerce.date().transform((value) => value.toISOString()),
});
export const eventRsvpListSchema = z.object({
  data: z.array(eventRsvpSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type AdminEvent = z.infer<typeof adminEventSchema>;
export type EventEditorValues = z.infer<typeof eventEditorSchema>;
export type EventRsvp = z.infer<typeof eventRsvpSchema>;
export const emptyEventEditor: EventEditorValues = {
  slug: '',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  imageUrl: '',
  rsvpEnabled: false,
  status: 'DRAFT',
  languageCode: 'en',
};
export function eventEditorFromEvent(event: AdminEvent): EventEditorValues {
  return {
    slug: event.slug,
    title: event.title,
    description: event.description,
    startDate: toLocalInput(event.startDate),
    endDate: toLocalInput(event.endDate),
    location: event.location,
    imageUrl: event.imageUrl ?? '',
    rsvpEnabled: event.rsvpEnabled,
    status: event.status,
    languageCode: event.languageCode,
  };
}
function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

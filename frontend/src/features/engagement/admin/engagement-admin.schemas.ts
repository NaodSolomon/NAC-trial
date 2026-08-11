import { z } from 'zod';

const isoDate = z.coerce.date().transform((value) => value.toISOString());
const pageMeta = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export const contactSubmissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  subject: z.string().nullable(),
  message: z.string(),
  languageCode: z.enum(['en', 'am']),
  createdAt: isoDate,
});

export const volunteerApplicationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  roleInterest: z.string(),
  message: z.string(),
  languageCode: z.enum(['en', 'am']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt: isoDate,
});

export const testimonialSchema = z.object({
  id: z.string().uuid(),
  translationKey: z.string().uuid(),
  name: z.string(),
  text: z.string(),
  languageCode: z.enum(['en', 'am']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  createdBy: z.string().uuid(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const newsletterSubscriberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  languageCode: z.enum(['en', 'am']),
  createdAt: isoDate,
});

export const contactListSchema = z.object({
  data: z.array(contactSubmissionSchema),
  meta: pageMeta,
});
export const volunteerListSchema = z.object({
  data: z.array(volunteerApplicationSchema),
  meta: pageMeta,
});
export const testimonialListSchema = z.object({ data: z.array(testimonialSchema), meta: pageMeta });
export const newsletterListSchema = z.object({
  data: z.array(newsletterSubscriberSchema),
  meta: pageMeta,
});

export const testimonialEditorSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(100),
  text: z.string().trim().min(10, 'Testimonial must contain at least 10 characters.').max(2000),
  languageCode: z.enum(['en', 'am']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
export type VolunteerApplication = z.infer<typeof volunteerApplicationSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;
export type TestimonialEditorValues = z.infer<typeof testimonialEditorSchema>;

export const emptyTestimonial: TestimonialEditorValues = {
  name: '',
  text: '',
  languageCode: 'en',
  status: 'DRAFT',
};

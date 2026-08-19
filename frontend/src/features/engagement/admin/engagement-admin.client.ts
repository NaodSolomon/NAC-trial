import { browserApiClient } from '@/lib/api/browser-client';
import {
  contactListSchema,
  newsletterListSchema,
  testimonialListSchema,
  testimonialSchema,
  volunteerListSchema,
  type TestimonialEditorValues,
} from './engagement-admin.schemas';

interface ListCriteria {
  page: number;
  limit?: number;
  languageCode?: string;
  search?: string;
  status?: string;
  signal?: AbortSignal;
}

function listQuery(criteria: ListCriteria) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: String(criteria.limit ?? 10),
    sortOrder: 'desc',
  });
  if (criteria.languageCode) query.set('languageCode', criteria.languageCode);
  if (criteria.search) query.set('search', criteria.search.trim());
  if (criteria.status) query.set('status', criteria.status);
  return query;
}

export async function listContactSubmissions(criteria: ListCriteria) {
  return contactListSchema.parse(
    await browserApiClient.get(`/admin/contact?${listQuery(criteria)}`, {
      signal: criteria.signal,
    }),
  );
}

export function deleteContactSubmission(id: string) {
  return browserApiClient.delete(`/admin/contact/${encodeURIComponent(id)}`);
}

export async function listVolunteerApplications(criteria: ListCriteria) {
  return volunteerListSchema.parse(
    await browserApiClient.get(`/admin/volunteers?${listQuery(criteria)}`, {
      signal: criteria.signal,
    }),
  );
}

export function deleteVolunteerApplication(id: string) {
  return browserApiClient.delete(`/admin/volunteers/${encodeURIComponent(id)}`);
}

export async function listAdminTestimonials(criteria: ListCriteria) {
  return testimonialListSchema.parse(
    await browserApiClient.get(`/admin/testimonials?${listQuery(criteria)}`, {
      signal: criteria.signal,
    }),
  );
}

export async function createTestimonial(values: TestimonialEditorValues) {
  return testimonialSchema.parse(await browserApiClient.post('/admin/testimonials', values));
}

export async function updateTestimonial(id: string, values: TestimonialEditorValues) {
  return testimonialSchema.parse(
    await browserApiClient.patch(`/admin/testimonials/${encodeURIComponent(id)}`, {
      name: values.name,
      text: values.text,
      status: values.status,
    }),
  );
}

export function deleteTestimonial(id: string) {
  return browserApiClient.delete(`/admin/testimonials/${encodeURIComponent(id)}`);
}

export async function listNewsletterSubscribers(criteria: ListCriteria) {
  return newsletterListSchema.parse(
    await browserApiClient.get(`/admin/newsletter?${listQuery(criteria)}`, {
      signal: criteria.signal,
    }),
  );
}

export function deleteNewsletterSubscriber(email: string) {
  // The backend contract currently identifies subscribers by email. Keep this value out of
  // query keys, feedback messages, analytics and logs; it exists only for this authenticated call.
  return browserApiClient.delete(`/admin/newsletter/${encodeURIComponent(email)}`);
}

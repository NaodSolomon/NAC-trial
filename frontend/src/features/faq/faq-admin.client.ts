import { browserApiClient } from '@/lib/api/browser-client';
import { adminFaqListSchema, adminFaqSchema } from './faq.schemas';
import type { FaqEditorValues } from './faq-admin.schemas';

export async function listAdminFaqs(criteria: {
  page: number;
  languageCode?: string;
  status?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({ page: String(criteria.page), limit: '50' });
  if (criteria.languageCode) query.set('languageCode', criteria.languageCode);
  if (criteria.status) query.set('status', criteria.status);

  return adminFaqListSchema.parse(
    await browserApiClient.get(`/admin/faqs?${query}`, { signal: criteria.signal }),
  );
}

function payload(values: FaqEditorValues, includeIdentity: boolean) {
  return {
    ...(includeIdentity && {
      translationKey: values.translationKey,
      languageCode: values.languageCode,
    }),
    question: values.question,
    answer: values.answer,
    ...(values.category ? { category: values.category } : {}),
  };
}

export async function createFaq(values: FaqEditorValues) {
  return adminFaqSchema.parse(await browserApiClient.post('/admin/faqs', payload(values, true)));
}

export async function updateFaq(id: string, values: FaqEditorValues) {
  return adminFaqSchema.parse(
    await browserApiClient.patch(`/admin/faqs/${encodeURIComponent(id)}`, payload(values, false)),
  );
}

export async function publishFaq(id: string) {
  return adminFaqSchema.parse(
    await browserApiClient.post(`/admin/faqs/${encodeURIComponent(id)}/publish`),
  );
}

export async function unpublishFaq(id: string) {
  return adminFaqSchema.parse(
    await browserApiClient.post(`/admin/faqs/${encodeURIComponent(id)}/unpublish`),
  );
}

export function reorderFaqs(entries: Array<{ id: string; sortOrder: number }>) {
  return browserApiClient.post('/admin/faqs/reorder', { entries });
}

export function deleteFaq(id: string) {
  return browserApiClient.delete(`/admin/faqs/${encodeURIComponent(id)}`);
}

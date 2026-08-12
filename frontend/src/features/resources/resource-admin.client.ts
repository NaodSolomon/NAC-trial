import { browserApiClient } from '@/lib/api/browser-client';
import {
  adminResourceListSchema,
  adminResourceSchema,
  type ResourceEditorValues,
} from './resource-admin.schemas';
export async function listAdminResources(criteria: {
  page: number;
  languageCode?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({ page: String(criteria.page), limit: '12' });
  if (criteria.languageCode) query.set('languageCode', criteria.languageCode);
  return adminResourceListSchema.parse(
    await browserApiClient.get(`/admin/resources?${query}`, { signal: criteria.signal }),
  );
}
export async function createResource(values: ResourceEditorValues) {
  return adminResourceSchema.parse(
    await browserApiClient.post('/admin/resources', values),
  );
}
export async function publishResource(id: string) {
  return adminResourceSchema.parse(
    await browserApiClient.post(`/admin/resources/${encodeURIComponent(id)}/publish`),
  );
}
export function deleteResource(id: string) {
  return browserApiClient.delete(`/admin/resources/${encodeURIComponent(id)}`);
}

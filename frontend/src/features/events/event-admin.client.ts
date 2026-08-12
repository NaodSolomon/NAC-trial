import { browserApiClient } from '@/lib/api/browser-client';
import { downloadAuthenticatedFile } from '@/lib/api/file-download';
import {
  adminEventListSchema,
  adminEventSchema,
  eventRsvpListSchema,
  type EventEditorValues,
} from './event-admin.schemas';
export async function listAdminEvents(criteria: {
  page: number;
  languageCode?: string;
  status?: string;
  timeframe?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: '12',
    timeframe: criteria.timeframe ?? 'all',
    sortOrder: 'desc',
  });
  if (criteria.languageCode) query.set('languageCode', criteria.languageCode);
  if (criteria.status) query.set('status', criteria.status);
  return adminEventListSchema.parse(
    await browserApiClient.get(`/admin/events?${query}`, { signal: criteria.signal }),
  );
}
function payload(values: EventEditorValues, includeLanguage: boolean) {
  return {
    slug: values.slug,
    title: values.title,
    description: values.description,
    startDate: new Date(values.startDate).toISOString(),
    endDate: new Date(values.endDate).toISOString(),
    location: values.location,
    rsvpEnabled: values.rsvpEnabled,
    status: values.status,
    ...(includeLanguage && { languageCode: values.languageCode }),
  };
}
export async function createEvent(values: EventEditorValues) {
  return adminEventSchema.parse(
    await browserApiClient.post('/admin/events', payload(values, true)),
  );
}
export async function updateEvent(id: string, values: EventEditorValues) {
  return adminEventSchema.parse(
    await browserApiClient.patch(
      `/admin/events/${encodeURIComponent(id)}`,
      payload(values, false),
    ),
  );
}
export function deleteEvent(id: string) {
  return browserApiClient.delete(`/admin/events/${encodeURIComponent(id)}`);
}
export async function listEventRsvps(eventId: string, page: number, signal?: AbortSignal) {
  return eventRsvpListSchema.parse(
    await browserApiClient.get(
      `/admin/events/${encodeURIComponent(eventId)}/rsvps?page=${page}&limit=20`,
      { signal },
    ),
  );
}
export function exportEventRsvps(eventId: string, slug: string) {
  return downloadAuthenticatedFile(
    `/admin/events/${encodeURIComponent(eventId)}/rsvps/export`,
    `${slug}-rsvps.csv`,
  );
}

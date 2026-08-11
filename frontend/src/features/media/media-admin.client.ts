import { browserApiClient } from '@/lib/api/browser-client';
import { uploadFormData } from '@/lib/api/upload-client';
import { mediaAssetSchema, mediaListSchema } from './media-admin.schemas';

export async function listMedia(criteria: {
  page: number;
  type?: string;
  search?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: '12',
    sortOrder: 'desc',
  });
  if (criteria.type) query.set('type', criteria.type);
  if (criteria.search) query.set('search', criteria.search);
  return mediaListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/media?${query}`, { signal: criteria.signal }),
  );
}

export async function uploadMedia(form: FormData, onProgress: (percent: number) => void) {
  return mediaAssetSchema.parse(
    await uploadFormData<unknown>('/admin/media/upload', form, { onProgress }),
  );
}

export function deleteMedia(id: string) {
  return browserApiClient.delete<{ message: string }>(`/admin/media/${encodeURIComponent(id)}`);
}

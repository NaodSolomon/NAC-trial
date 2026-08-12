import { browserApiClient } from '@/lib/api/browser-client';
import { uploadFormData } from '@/lib/api/upload-client';
import { publicGalleryItemSchema, publicGalleryPageSchema } from './gallery.schemas';

export async function listAdminGallery(criteria: {
  page: number;
  languageCode: 'en' | 'am';
  type?: string;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: '12',
    languageCode: criteria.languageCode,
    sortOrder: 'desc',
  });
  if (criteria.type) query.set('type', criteria.type);
  return publicGalleryPageSchema.parse(
    await browserApiClient.get(`/public/gallery?${query}`, { signal: criteria.signal }),
  );
}
export async function uploadGallery(form: FormData, onProgress: (percent: number) => void) {
  return publicGalleryItemSchema.parse(
    await uploadFormData<unknown>('/admin/gallery', form, { onProgress }),
  );
}
export async function updateGallery(id: string, values: { title: string; altText: string }) {
  return publicGalleryItemSchema.parse(
    await browserApiClient.patch(`/admin/gallery/${encodeURIComponent(id)}`, values),
  );
}
export function deleteGallery(id: string) {
  return browserApiClient.delete(`/admin/gallery/${encodeURIComponent(id)}`);
}

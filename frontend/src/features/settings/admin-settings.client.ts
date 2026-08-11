import { browserApiClient } from '@/lib/api/browser-client';
import { siteSettingsSchema, type SettingsEditorValues } from './admin-settings.schemas';

export async function getAdminSettings(signal?: AbortSignal) {
  return siteSettingsSchema.parse(
    await browserApiClient.get<unknown>('/admin/settings', { signal }),
  );
}

export async function updateAdminSettings(values: SettingsEditorValues) {
  return siteSettingsSchema.parse(
    await browserApiClient.patch<unknown>('/admin/settings', {
      ...values,
      contactEmail: values.contactEmail,
      socialLinks: Object.fromEntries(
        Object.entries(values.socialLinks).filter(([, url]) => Boolean(url)),
      ),
    }),
  );
}

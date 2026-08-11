import { browserApiClient } from '@/lib/api/browser-client';
import {
  navigationItemSchema,
  navigationListSchema,
  type NavigationEditorValues,
  type NavigationItem,
  type NavigationLanguage,
} from './admin-navigation.schemas';

export async function listNavigation(languageCode: NavigationLanguage, signal?: AbortSignal) {
  const query = new URLSearchParams({ languageCode, page: '1', limit: '100' });
  return navigationListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/navigation?${query}`, { signal }),
  );
}

export async function createNavigationItem(
  languageCode: NavigationLanguage,
  values: NavigationEditorValues,
  order: number,
) {
  return navigationItemSchema.parse(
    await browserApiClient.post<unknown>('/admin/navigation', {
      ...values,
      languageCode,
      order,
    }),
  );
}

export async function updateNavigationItem(
  id: string,
  values: Partial<Pick<NavigationItem, 'label' | 'url' | 'order' | 'isVisible'>>,
) {
  return navigationItemSchema.parse(
    await browserApiClient.patch<unknown>(`/admin/navigation/${encodeURIComponent(id)}`, values),
  );
}

export async function reorderNavigationItems(first: NavigationItem, second: NavigationItem) {
  await Promise.all([
    updateNavigationItem(first.id, { order: second.order }),
    updateNavigationItem(second.id, { order: first.order }),
  ]);
}

export function deleteNavigationItem(id: string) {
  return browserApiClient.delete<{ message: string }>(
    `/admin/navigation/${encodeURIComponent(id)}`,
  );
}

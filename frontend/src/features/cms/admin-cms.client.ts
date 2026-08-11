import { browserApiClient } from '@/lib/api/browser-client';
import {
  adminCmsPageListSchema,
  adminCmsPageSchema,
  slugAvailabilitySchema,
  type AdminCmsPage,
  type CmsEditorValues,
  type CmsStatus,
} from './admin-cms.schemas';

export async function listAdminCmsPages(criteria: {
  page: number;
  limit?: number;
  languageCode?: 'en' | 'am' | 'all';
  status?: CmsStatus | 'all';
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    page: String(criteria.page),
    limit: String(criteria.limit ?? 10),
    sortOrder: 'desc',
  });
  if (criteria.languageCode && criteria.languageCode !== 'all')
    query.set('languageCode', criteria.languageCode);
  if (criteria.status && criteria.status !== 'all') query.set('status', criteria.status);
  return adminCmsPageListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/cms/pages?${query}`, { signal: criteria.signal }),
  );
}

export async function getAdminCmsPage(id: string, signal?: AbortSignal) {
  return adminCmsPageSchema.parse(
    await browserApiClient.get<unknown>(`/admin/cms/pages/${encodeURIComponent(id)}`, { signal }),
  );
}

export async function checkCmsSlug(slug: string, languageCode: 'en' | 'am') {
  const query = new URLSearchParams({ slug, languageCode });
  return slugAvailabilitySchema.parse(
    await browserApiClient.get<unknown>(`/admin/slugs/check?${query}`, { cache: 'no-store' }),
  );
}

export async function createCmsPage(values: CmsEditorValues) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post<unknown>('/admin/cms/pages', editorPayload(values, true)),
  );
}

export async function updateCmsPage(id: string, values: CmsEditorValues) {
  return adminCmsPageSchema.parse(
    await browserApiClient.patch<unknown>(
      `/admin/cms/pages/${encodeURIComponent(id)}`,
      editorPayload(values, false),
    ),
  );
}

export async function publishCmsPage(id: string) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post<unknown>(`/admin/cms/pages/${encodeURIComponent(id)}/publish`),
  );
}

export async function scheduleCmsPage(id: string, localDateTime: string) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post<unknown>(`/admin/cms/pages/${encodeURIComponent(id)}/schedule`, {
      scheduledAt: localDateTimeToIso(localDateTime),
    }),
  );
}

export async function deleteCmsPage(id: string) {
  return browserApiClient.delete<{ message: string }>(`/admin/cms/pages/${encodeURIComponent(id)}`);
}

export function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()))
    throw new Error('Choose a valid local date and time.');
  return date.toISOString();
}

export function editorValuesFromPage(page?: AdminCmsPage): CmsEditorValues {
  const metadata = page?.metadata ?? {};
  const sections = Array.isArray(metadata.sections) ? metadata.sections : [];
  const hero = objectSection(sections, 'hero');
  const services = objectSection(sections, 'services');
  const cta = objectSection(sections, 'callToAction');
  const faqItems = Array.isArray(metadata.items) ? metadata.items : [];
  const contentType = sections.length ? 'homepage' : faqItems.length ? 'faq' : 'generic';
  return {
    slug: page?.slug ?? '',
    languageCode: page?.languageCode ?? 'en',
    title: page?.title ?? '',
    content: page?.content ?? '',
    translationKey: page?.translationKey ?? '',
    contentType,
    homepage: {
      heroHeading: stringValue(hero.heading),
      heroBody: stringValue(hero.body),
      primaryLabel: stringValue(objectValue(hero.primaryAction).label),
      primaryHref: stringValue(objectValue(hero.primaryAction).href),
      servicesHeading: stringValue(services.heading),
      services: Array.isArray(services.items)
        ? services.items.map((item) => ({
            title: stringValue(objectValue(item).title),
            body: stringValue(objectValue(item).body),
          }))
        : [],
      ctaHeading: stringValue(cta.heading),
      ctaBody: stringValue(cta.body),
      ctaLabel: stringValue(objectValue(cta.action).label),
      ctaHref: stringValue(objectValue(cta.action).href),
    },
    faqs: faqItems.map((item) => ({
      question: stringValue(objectValue(item).question),
      answer: stringValue(objectValue(item).answer),
    })),
  };
}

function editorPayload(values: CmsEditorValues, includeLanguage: boolean) {
  return {
    slug: values.slug,
    ...(includeLanguage && { languageCode: values.languageCode }),
    title: values.title,
    content: values.content,
    ...(includeLanguage && values.translationKey && { translationKey: values.translationKey }),
    metadata:
      values.contentType === 'homepage'
        ? {
            sections: [
              {
                type: 'hero',
                heading: values.homepage.heroHeading,
                ...(values.homepage.heroBody && { body: values.homepage.heroBody }),
                ...(values.homepage.primaryLabel && values.homepage.primaryHref
                  ? {
                      primaryAction: {
                        label: values.homepage.primaryLabel,
                        href: values.homepage.primaryHref,
                      },
                    }
                  : {}),
              },
              {
                type: 'services',
                heading: values.homepage.servicesHeading,
                items: values.homepage.services,
              },
              {
                type: 'callToAction',
                heading: values.homepage.ctaHeading,
                ...(values.homepage.ctaBody && { body: values.homepage.ctaBody }),
                action: { label: values.homepage.ctaLabel, href: values.homepage.ctaHref },
              },
            ],
          }
        : values.contentType === 'faq'
          ? { items: values.faqs }
          : {},
  };
}

function objectSection(values: unknown[], type: string): Record<string, unknown> {
  return objectValue(values.find((value) => objectValue(value).type === type));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

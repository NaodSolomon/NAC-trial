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
    await browserApiClient.get(`/admin/cms/pages?${query}`, { signal: criteria.signal }),
  );
}

export async function getAdminCmsPage(id: string, signal?: AbortSignal) {
  return adminCmsPageSchema.parse(
    await browserApiClient.get(`/admin/cms/pages/${encodeURIComponent(id)}`, { signal }),
  );
}

export async function checkCmsSlug(slug: string, languageCode: 'en' | 'am') {
  const query = new URLSearchParams({ slug, languageCode });
  return slugAvailabilitySchema.parse(
    await browserApiClient.get(`/admin/slugs/check?${query}`, { cache: 'no-store' }),
  );
}

export async function createCmsPage(values: CmsEditorValues) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post('/admin/cms/pages', editorPayload(values, true)),
  );
}

export async function updateCmsPage(id: string, values: CmsEditorValues) {
  return adminCmsPageSchema.parse(
    await browserApiClient.patch(
      `/admin/cms/pages/${encodeURIComponent(id)}`,
      editorPayload(values, false),
    ),
  );
}

export async function publishCmsPage(id: string) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post(`/admin/cms/pages/${encodeURIComponent(id)}/publish`),
  );
}

export async function scheduleCmsPage(id: string, localDateTime: string) {
  return adminCmsPageSchema.parse(
    await browserApiClient.post(`/admin/cms/pages/${encodeURIComponent(id)}/schedule`, {
      scheduledAt: localDateTimeToIso(localDateTime),
    }),
  );
}

export async function deleteCmsPage(id: string) {
  return browserApiClient.delete(`/admin/cms/pages/${encodeURIComponent(id)}`);
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
  const location = objectSection(sections, 'location');
  const cta = objectSection(sections, 'callToAction');
  const about = objectValue(metadata.about);
  const mission = objectValue(about.mission);
  const history = objectValue(about.history);
  const aboutServices = arrayValue(about.services);
  const volunteerRoles = arrayValue(metadata.volunteerRoles);
  const teamMembers = arrayValue(metadata.teamMembers);
  const contentType = sections.length
    ? 'homepage'
    : Object.keys(about).length
      ? 'about'
      : volunteerRoles.length
        ? 'volunteer'
        : teamMembers.length
          ? 'team'
          : typeof metadata.mapEmbedUrl === 'string' && metadata.mapEmbedUrl
            ? 'contact'
            : 'generic';
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
      secondaryLabel: stringValue(objectValue(hero.secondaryAction).label),
      secondaryHref: stringValue(objectValue(hero.secondaryAction).href),
      servicesHeading: stringValue(services.heading),
      services: Array.isArray(services.items)
        ? services.items.map((item) => ({
            title: stringValue(objectValue(item).title),
            body: stringValue(objectValue(item).body),
          }))
        : [],
      locationHeading: stringValue(location.heading),
      locationBody: stringValue(location.body),
      mapEmbedUrl: stringValue(location.mapEmbedUrl),
      ctaHeading: stringValue(cta.heading),
      ctaBody: stringValue(cta.body),
      ctaLabel: stringValue(objectValue(cta.action).label),
      ctaHref: stringValue(objectValue(cta.action).href),
    },
    about: {
      contentApproved: metadata.contentApproved === true,
      missionHeading: stringValue(mission.heading),
      missionBody: stringValue(mission.body),
      historyHeading: stringValue(history.heading),
      historyBody: stringValue(history.body),
      services: aboutServices.map((item) => ({
        title: stringValue(objectValue(item).title),
        body: stringValue(objectValue(item).body),
      })),
    },
    volunteerRoles: volunteerRoles.map((item) => ({
      title: stringValue(objectValue(item).title),
      summary: stringValue(objectValue(item).summary),
      commitment: stringValue(objectValue(item).commitment),
    })),
    teamMembers: teamMembers.map((item) => ({
      name: stringValue(objectValue(item).name),
      role: stringValue(objectValue(item).role),
      biography: stringValue(objectValue(item).biography),
    })),
    teamContentApproved: metadata.contentApproved === true,
    contactMapEmbedUrl: stringValue(metadata.mapEmbedUrl),
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
                ...(values.homepage.secondaryLabel && values.homepage.secondaryHref
                  ? {
                      secondaryAction: {
                        label: values.homepage.secondaryLabel,
                        href: values.homepage.secondaryHref,
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
                type: 'location',
                heading: values.homepage.locationHeading,
                ...(values.homepage.locationBody && { body: values.homepage.locationBody }),
                mapEmbedUrl: values.homepage.mapEmbedUrl,
              },
              {
                type: 'callToAction',
                heading: values.homepage.ctaHeading,
                ...(values.homepage.ctaBody && { body: values.homepage.ctaBody }),
                action: { label: values.homepage.ctaLabel, href: values.homepage.ctaHref },
              },
            ],
          }
        : values.contentType === 'about'
          ? {
              contentApproved: values.about.contentApproved,
              about: {
                mission: {
                  heading: values.about.missionHeading,
                  body: values.about.missionBody,
                },
                history: {
                  heading: values.about.historyHeading,
                  body: values.about.historyBody,
                },
                services: values.about.services,
              },
            }
          : values.contentType === 'volunteer'
            ? {
                volunteerRoles: values.volunteerRoles.map((role) => ({
                  title: role.title,
                  summary: role.summary,
                  ...(role.commitment && { commitment: role.commitment }),
                })),
              }
            : values.contentType === 'team'
              ? {
                  contentApproved: values.teamContentApproved,
                  teamMembers: values.teamMembers,
                }
              : values.contentType === 'contact'
                ? { mapEmbedUrl: values.contactMapEmbedUrl }
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

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

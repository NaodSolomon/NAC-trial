import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editorValuesFromPage, localDateTimeToIso, scheduleCmsPage } from './admin-cms.client';
import { cmsEditorSchema, type AdminCmsPage } from './admin-cms.schemas';

const { apiPost } = vi.hoisted(() => ({ apiPost: vi.fn() }));
vi.mock('@/lib/api/browser-client', () => ({
  browserApiClient: { get: vi.fn(), post: apiPost, patch: vi.fn(), delete: vi.fn() },
}));

const page: AdminCmsPage = {
  id: '00000000-0000-4000-8000-000000001001',
  translationKey: '00000000-0000-4000-8000-000000001002',
  slug: 'home',
  languageCode: 'en',
  title: 'Homepage',
  content: 'Welcome.',
  status: 'PUBLISHED',
  metadata: {
    sections: [
      { type: 'hero', heading: 'Welcome', body: 'Support for families.' },
      { type: 'services', heading: 'Services', items: [{ title: 'Therapy', body: 'Care.' }] },
      {
        type: 'location',
        heading: 'Find us',
        body: 'Addis Ababa',
        mapEmbedUrl: 'https://www.google.com/maps?q=Addis+Ababa&output=embed',
      },
      { type: 'callToAction', heading: 'Help', action: { label: 'Donate', href: '/donate' } },
    ],
  },
  seoTitle: null,
  seoDescription: null,
  seoImageUrl: null,
  seoKeywords: [],
  createdBy: '00000000-0000-4000-8000-000000001003',
  scheduledAt: null,
  publishedAt: '2026-08-11T10:00:00.000Z',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

describe('CMS administration contracts', () => {
  beforeEach(() => apiPost.mockReset());

  it('maps structured homepage metadata into typed editor fields', () => {
    const values = editorValuesFromPage(page);
    expect(values.contentType).toBe('homepage');
    expect(values.homepage.heroHeading).toBe('Welcome');
    expect(values.homepage.services[0]).toEqual({ title: 'Therapy', body: 'Care.' });
    expect(values.homepage.mapEmbedUrl).toContain('google.com/maps');
    expect(values.homepage.ctaHref).toBe('/donate');
  });

  it('requires structured homepage content within backend limits', () => {
    const empty = editorValuesFromPage();
    expect(
      cmsEditorSchema.safeParse({
        ...empty,
        slug: 'home',
        title: 'Home',
        content: 'Body',
        contentType: 'homepage',
      }).success,
    ).toBe(false);
  });

  it('no longer accepts a faq content type, which the FAQ module now owns', () => {
    const empty = editorValuesFromPage();
    expect(
      cmsEditorSchema.safeParse({
        ...empty,
        slug: 'faqs',
        title: 'FAQs',
        content: 'Body',
        contentType: 'faq',
      }).success,
    ).toBe(false);
  });

  it('converts a local schedule value to ISO before transmission', async () => {
    apiPost.mockResolvedValue({
      ...page,
      status: 'SCHEDULED',
      scheduledAt: '2030-01-02T09:30:00.000Z',
      publishedAt: null,
    });
    const localValue = '2030-01-02T12:30';
    await scheduleCmsPage(page.id, localValue);
    expect(apiPost).toHaveBeenCalledWith(`/admin/cms/pages/${page.id}/schedule`, {
      scheduledAt: localDateTimeToIso(localValue),
    });
    expect(localDateTimeToIso(localValue)).toBe(new Date(localValue).toISOString());
  });
});

import { expect, test } from '@playwright/test';

const administrator = {
  id: 'admin-visual-super',
  email: 'admin@example.org',
  name: 'Super Administrator',
  role: 'SUPER_ADMIN',
} as const;
const cmsPage = {
  id: '00000000-0000-4000-8000-000000001201',
  translationKey: '00000000-0000-4000-8000-000000001202',
  slug: 'home',
  languageCode: 'en',
  title: 'Homepage',
  content: 'Welcome to Nehemiah Autism Center.',
  status: 'PUBLISHED',
  metadata: {},
  seoTitle: 'Autism Support Ethiopia',
  seoDescription: 'Support and services for autistic children and families.',
  seoImageUrl: null,
  seoKeywords: ['autism', 'ethiopia'],
  createdBy: '00000000-0000-4000-8000-000000001203',
  scheduledAt: null,
  publishedAt: '2026-08-10T10:00:00.000Z',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'visual-refresh-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ accessToken: 'visual-access-token', expiresIn: 900, admin: administrator }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: envelope(administrator) }),
  );
  await page.route('**/api/v1/admin/analytics/summary', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        totalVisitors: 1248,
        topCountries: [{ country: 'ET', visits: 900 }],
        topPages: [{ route: '/', visits: 720 }],
      }),
    }),
  );
  await page.route('**/api/v1/admin/donations/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        totalDonations: 18,
        totals: [{ currency: 'USD', amount: '1250.00' }],
      }),
    }),
  );
  await page.route('**/api/v1/admin/cms/pages**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope(
        path.endsWith(cmsPage.id)
          ? cmsPage
          : {
              data: [
                cmsPage,
                {
                  ...cmsPage,
                  id: '00000000-0000-4000-8000-000000001204',
                  slug: 'faqs',
                  title: 'Frequently asked questions',
                  status: 'SCHEDULED',
                  scheduledAt: '2030-01-02T09:30:00.000Z',
                  publishedAt: null,
                },
              ],
              meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
            },
      ),
    });
  });
  await page.route('**/api/v1/admin/navigation?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        data: [
          {
            id: '00000000-0000-4000-8000-000000001301',
            label: 'Home',
            url: '/',
            order: 0,
            languageCode: 'en',
            isVisible: true,
            createdBy: '00000000-0000-4000-8000-000000001203',
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-10T10:00:00.000Z',
          },
          {
            id: '00000000-0000-4000-8000-000000001302',
            label: 'About us',
            url: '/about',
            order: 10,
            languageCode: 'en',
            isVisible: true,
            createdBy: '00000000-0000-4000-8000-000000001203',
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-10T10:00:00.000Z',
          },
        ],
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      }),
    }),
  );
  await page.route('**/api/v1/admin/settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        id: '00000000-0000-4000-8000-000000001303',
        key: 'global',
        siteName: 'Nehemiah Autism Center',
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'am'],
        contactEmail: 'info@nehemiah.example',
        phone: '+251 11 000 0000',
        address: 'Addis Ababa, Ethiopia',
        socialLinks: { facebook: 'https://facebook.com/nehemiah' },
        updatedBy: '00000000-0000-4000-8000-000000001203',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
      }),
    }),
  );
  await page.route('**/api/v1/admin/media?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } }),
    }),
  );
  await page.route('**/api/v1/public/gallery?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } }),
    }),
  );
  await page.route('**/api/v1/admin/blog?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        data: [
          {
            id: '00000000-0000-4000-8000-000000001501',
            slug: 'family-support',
            languageCode: 'en',
            title: 'Family support',
            excerpt: 'Practical support for families.',
            content: 'Article content.',
            status: 'DRAFT',
            seoTitle: null,
            seoDescription: null,
            seoImageUrl: null,
            createdBy: '00000000-0000-4000-8000-000000001203',
            publishedAt: null,
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-10T10:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      }),
    }),
  );
  await page.route('**/api/v1/admin/resources?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        data: [
          {
            id: '00000000-0000-4000-8000-000000001502',
            title: 'Family guide',
            description: 'A practical downloadable guide.',
            fileUrl: 'http://127.0.0.1:4010/media/family-guide.pdf',
            fileName: 'family-guide.pdf',
            mimeType: 'application/pdf',
            languageCode: 'en',
            status: 'PUBLISHED',
            downloadCount: 24,
            createdBy: '00000000-0000-4000-8000-000000001203',
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-10T10:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      }),
    }),
  );
  await page.route('**/api/v1/admin/events?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        data: [
          {
            id: '00000000-0000-4000-8000-000000001503',
            translationKey: '00000000-0000-4000-8000-000000001504',
            slug: 'family-day',
            title: 'Family day',
            description: 'A welcoming event for families.',
            startDate: '2030-08-12T10:00:00.000Z',
            endDate: '2030-08-12T12:00:00.000Z',
            location: 'Addis Ababa',
            rsvpEnabled: true,
            status: 'PUBLISHED',
            languageCode: 'en',
            createdBy: '00000000-0000-4000-8000-000000001203',
            createdAt: '2026-08-01T10:00:00.000Z',
            updatedAt: '2026-08-10T10:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      }),
    }),
  );
});

test('administrator shell matches the responsive workspace baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(page.getByText('Page views')).toBeVisible();
  await expect(page).toHaveScreenshot('admin-dashboard.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

for (const screen of [
  { name: 'admin-cms-list', path: '/admin/content', ready: 'CMS pages' },
  { name: 'admin-cms-editor', path: `/admin/content/${cmsPage.id}`, ready: 'Edit Homepage' },
  { name: 'admin-seo-editor', path: '/admin/seo', ready: 'SEO metadata' },
  { name: 'admin-navigation', path: '/admin/navigation', ready: 'Navigation' },
  { name: 'admin-settings', path: '/admin/settings', ready: 'Public settings' },
  { name: 'admin-media', path: '/admin/media', ready: 'Media' },
  { name: 'admin-gallery', path: '/admin/gallery', ready: 'Gallery' },
  { name: 'admin-blog', path: '/admin/blog', ready: 'Blog administration' },
  { name: 'admin-resources', path: '/admin/resources', ready: 'Resources' },
  { name: 'admin-events', path: '/admin/events', ready: 'Event administration' },
] as const) {
  test(`${screen.name} matches the responsive workspace baseline`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(screen.path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: screen.ready })).toBeVisible();
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });
}

function envelope(data: unknown) {
  return JSON.stringify({
    success: true,
    data,
    statusCode: 200,
    timestamp: new Date(0).toISOString(),
  });
}

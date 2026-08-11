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

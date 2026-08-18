import { expect, test, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001301';
const baseItem = {
  id: '00000000-0000-4000-8000-000000001302',
  label: 'Home',
  url: '/',
  order: 0,
  languageCode: 'en',
  isVisible: true,
  createdBy: adminId,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

test('English and Amharic navigation are independent and successful changes reach public navigation', async ({
  context,
  page,
}) => {
  await mockAuth(context, page, 'CONTENT_EDITOR');
  let items = [
    baseItem,
    {
      ...baseItem,
      id: '00000000-0000-4000-8000-000000001303',
      label: 'About',
      url: '/about',
      order: 10,
    },
  ];
  const amItems = [
    { ...baseItem, id: '00000000-0000-4000-8000-000000001304', label: 'መነሻ', languageCode: 'am' },
  ];
  await page.route('**/api/v1/admin/navigation?**', (route) => {
    const language = new URL(route.request().url()).searchParams.get('languageCode');
    return respond(route, {
      data: language === 'am' ? amItems : items,
      meta: { total: language === 'am' ? 1 : items.length, page: 1, limit: 100, totalPages: 1 },
    });
  });
  await page.route('**/api/v1/admin/navigation/**', async (route) => {
    const id = route.request().url().split('/').at(-1)!;
    const patch = route.request().postDataJSON() as Record<string, unknown>;
    const current = items.find((item) => item.id === id)!;
    const updated = { ...current, ...patch, updatedAt: '2026-08-11T10:00:00.000Z' };
    items = items.map((item) => (item.id === id ? updated : item));
    return respond(route, updated);
  });
  await page.route('**/api/v1/navigation?**', (route) =>
    respond(
      route,
      items.filter((item) => item.isVisible),
    ),
  );

  await page.goto('/admin/navigation');
  await expect(page.getByRole('form', { name: 'Edit Home' })).toBeVisible();
  await expect(page.getByLabel('Label', { exact: true })).toHaveCount(2);

  await page.getByRole('tab', { name: 'Amharic' }).click();
  await expect(page.getByRole('form', { name: 'Edit መነሻ' })).toBeVisible();
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue('መነሻ');

  await page.getByRole('tab', { name: 'English' }).click();
  const homeRow = page.getByRole('form', { name: 'Edit Home' });
  await expect(homeRow).toBeVisible();
  await homeRow.getByLabel('Label', { exact: true }).fill('Welcome');
  await homeRow.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Navigation item saved')).toBeVisible();

  const publicNavigation = page.waitForResponse(
    (response) =>
      /\/api\/v1\/navigation\?/.test(response.url()) && response.request().method() === 'GET',
  );
  await page.goto('/');
  await publicNavigation;
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).getByText('Welcome'),
  ).toBeVisible();
});

test('content editors cannot open global settings', async ({ context, page }) => {
  await mockAuth(context, page, 'CONTENT_EDITOR');
  await page.goto('/admin/settings');
  await expect(
    page.getByRole('heading', { name: 'Your role cannot access this section' }),
  ).toBeVisible();
});

test('a super administrator updates contact and social settings', async ({ context, page }) => {
  await mockAuth(context, page, 'SUPER_ADMIN');
  const settings = {
    id: '00000000-0000-4000-8000-000000001305',
    key: 'global',
    siteName: 'Nehemiah Autism Center',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'am'],
    contactEmail: 'info@example.org',
    phone: null,
    address: null,
    socialLinks: {},
    updatedBy: adminId,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  };
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/settings', async (route) => {
    if (route.request().method() === 'GET') return respond(route, settings);
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    return respond(route, { ...settings, ...submitted, updatedAt: '2026-08-11T10:00:00.000Z' });
  });
  await page.goto('/admin/settings');
  await page.getByLabel('Contact email').fill('families@example.org');
  await page.getByLabel('Facebook').fill('https://facebook.com/nehemiah');
  await page.getByRole('button', { name: 'Save public settings' }).click();
  await expect(page.getByText('Global settings saved')).toBeVisible();
  expect(submitted).toMatchObject({
    contactEmail: 'families@example.org',
    socialLinks: { facebook: 'https://facebook.com/nehemiah' },
  });
});

async function mockAuth(
  context: import('@playwright/test').BrowserContext,
  page: Page,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR',
) {
  const admin = { id: adminId, email: 'admin@example.org', name: 'Administrator', role };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'step-41-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'step-41-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

function respond(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: 200,
      timestamp: new Date(0).toISOString(),
    }),
  });
}

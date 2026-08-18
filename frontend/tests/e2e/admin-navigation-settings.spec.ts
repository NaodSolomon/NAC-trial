import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

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

const listPattern = /\/api\/v1\/admin\/navigation(\?|$)/;
const itemPattern = /\/api\/v1\/admin\/navigation\/[0-9a-f-]+$/i;
const publicPattern = /\/api\/v1\/navigation(\?|$)/;

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
  let amItems = [
    { ...baseItem, id: '00000000-0000-4000-8000-000000001304', label: 'መነሻ', languageCode: 'am' },
  ];
  const forLanguage = (language: string | null) => (language === 'am' ? amItems : items);

  await page.route(listPattern, (route) => {
    const data = forLanguage(new URL(route.request().url()).searchParams.get('languageCode'));
    return respond(route, {
      data,
      meta: { total: data.length, page: 1, limit: 100, totalPages: 1 },
    });
  });

  await page.route(itemPattern, (route) => {
    const request = route.request();
    const id = request.url().split('/').at(-1)!;
    const target = [...items, ...amItems].find((item) => item.id === id);
    if (!target) return route.fulfill({ status: 404, body: `unknown navigation item ${id}` });
    if (request.method() === 'DELETE') {
      items = items.filter((item) => item.id !== id);
      amItems = amItems.filter((item) => item.id !== id);
      return respond(route, null);
    }
    const patch = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const updated = { ...target, ...patch, updatedAt: '2026-08-11T10:00:00.000Z' };
    const apply = (list: typeof items) =>
      list.map((item) => (item.id === id ? updated : item)) as typeof items;
    items = apply(items);
    amItems = apply(amItems);
    return respond(route, updated);
  });

  await page.route(publicPattern, (route) => {
    const language = new URL(route.request().url()).searchParams.get('languageCode');
    return respond(
      route,
      forLanguage(language).filter((item) => item.isVisible),
    );
  });

  await page.goto('/admin/navigation');
  await waitForHydration(page);
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

  // The independence claim in this test's name is only proved by checking that the
  // English write left the Amharic list alone.
  await page.getByRole('tab', { name: 'Amharic' }).click();
  await expect(page.getByRole('form', { name: 'Edit መነሻ' })).toBeVisible();
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue('መነሻ');
  await expect(page.getByRole('form', { name: 'Edit Welcome' })).toHaveCount(0);

  const publicNavigation = page.waitForResponse(
    (response) => publicPattern.test(response.url()) && response.request().method() === 'GET',
  );
  await page.goto('/');
  await publicNavigation;
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(primary.getByText('Welcome')).toBeVisible();
  await expect(primary.getByText('Home', { exact: true })).toHaveCount(0);
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
    submitted = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    return respond(route, { ...settings, ...submitted, updatedAt: '2026-08-11T10:00:00.000Z' });
  });

  await page.goto('/admin/settings');
  await waitForHydration(page);
  await expect(page.getByLabel('Contact email')).toHaveValue('info@example.org');
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
  context: BrowserContext,
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

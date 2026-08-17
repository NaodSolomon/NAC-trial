import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001601';

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: status,
      timestamp: '2026-08-16T00:00:00.000Z',
    }),
  });
}

function siteSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-4000-8000-000000001602',
    key: 'global',
    siteName: 'Nehemiah Autism Center',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'am'],
    contactEmail: 'info@example.org',
    phone: '+251 11 000 0000',
    address: 'Addis Ababa, Ethiopia',
    socialLinks: { facebook: 'https://facebook.com/nehemiah' },
    updatedBy: adminId,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

async function openSettings(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'admin@example.org',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'settings-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'settings-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  const observed: { submitted?: Record<string, unknown> } = {};
  await page.route('**/api/v1/admin/settings', async (route) => {
    if (route.request().method() === 'GET') return respond(route, siteSettings());
    observed.submitted = route.request().postDataJSON() as Record<string, unknown>;
    return respond(route, siteSettings(observed.submitted));
  });

  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Public settings' })).toBeVisible();
  await expect(page.getByLabel('Site name')).toHaveValue('Nehemiah Autism Center');
  return observed;
}

test('loads existing settings into every field shape', async ({ context, page }) => {
  await openSettings(context, page);

  await expect(page.getByLabel('Site name')).toHaveValue('Nehemiah Autism Center');
  await expect(page.getByLabel('Default language')).toHaveValue('en');
  await expect(page.getByLabel('Contact email')).toHaveValue('info@example.org');
  await expect(page.getByLabel('Phone')).toHaveValue('+251 11 000 0000');
  await expect(page.getByLabel('Address')).toHaveValue('Addis Ababa, Ethiopia');
  await expect(page.getByLabel('Facebook')).toHaveValue('https://facebook.com/nehemiah');
  await expect(page.getByLabel('Instagram')).toHaveValue('');

  await expect(page.getByLabel('English')).toBeChecked();
  await expect(page.getByLabel('Amharic')).toBeChecked();
});

test('reports a non-HTTPS social link against that network only', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('Instagram').fill('http://instagram.com/nehemiah');
  await page.getByRole('button', { name: 'Save public settings' }).click();

  const instagram = page.getByLabel('Instagram');
  await expect(instagram).toHaveAttribute('aria-invalid', 'true');
  await expect(instagram).toHaveAttribute('aria-describedby', 'socialLinks.instagram-error');
  await expect(page.locator('#socialLinks\\.instagram-error')).toContainText(/HTTPS/i);

  await expect(page.getByLabel('Facebook')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByLabel('Youtube')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.submitted).toBeUndefined();
});

test('reports an invalid contact email beside the email field', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('Contact email').fill('not-an-email');
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.getByLabel('Contact email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#contactEmail-error')).toBeVisible();
  await expect(page.getByLabel('Site name')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.submitted).toBeUndefined();
});

test('moves focus to the first invalid field on submit', async ({ context, page }) => {
  await openSettings(context, page);

  await page.getByLabel('Site name').fill('N');
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.getByLabel('Site name')).toBeFocused();
});

test('requires the default language to remain enabled', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('English').uncheck();
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.locator('#defaultLanguage-error')).toContainText(/must also be enabled/i);
  await expect(page.getByLabel('Default language')).toHaveAttribute('aria-invalid', 'true');
  expect(observed.submitted).toBeUndefined();
});

test('requires at least one enabled public language', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('English').uncheck();
  await page.getByLabel('Amharic').uncheck();
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.getByRole('alert').filter({ hasText: /.+/ }).first()).toBeVisible();
  expect(observed.submitted).toBeUndefined();
});

test('submits the nested social links and language array together', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('Contact email').fill('families@example.org');
  await page.getByLabel('Instagram').fill('https://instagram.com/nehemiah');
  await page.getByLabel('Amharic').uncheck();
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.getByText('Global settings saved')).toBeVisible();
  expect(observed.submitted).toMatchObject({
    contactEmail: 'families@example.org',
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    socialLinks: {
      facebook: 'https://facebook.com/nehemiah',
      instagram: 'https://instagram.com/nehemiah',
    },
  });
});

test('clears a field error once the value becomes valid', async ({ context, page }) => {
  const observed = await openSettings(context, page);

  await page.getByLabel('Contact email').fill('not-an-email');
  await page.getByRole('button', { name: 'Save public settings' }).click();
  await expect(page.locator('#contactEmail-error')).toBeVisible();

  await page.getByLabel('Contact email').fill('families@example.org');
  await page.getByRole('button', { name: 'Save public settings' }).click();

  await expect(page.locator('#contactEmail-error')).toHaveCount(0);
  await expect.poll(() => observed.submitted?.contactEmail).toBe('families@example.org');
});

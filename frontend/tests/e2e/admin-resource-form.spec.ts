import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001801';
const resourceId = '00000000-0000-4000-8000-000000001802';

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

function resourceItem(overrides: Record<string, unknown> = {}) {
  return {
    id: resourceId,
    title: 'Family support guide',
    description: 'A practical guide for families.',
    fileUrl: 'http://localhost:9000/nehemiah-media/guides/family.pdf',
    fileName: 'family.pdf',
    mimeType: 'application/pdf',
    languageCode: 'en',
    status: 'DRAFT',
    downloadCount: 0,
    createdBy: adminId,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

async function openResourceAdmin(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'admin@example.org',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'resource-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'resource-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  const observed: { created?: Record<string, unknown> } = {};
  await page.route(/\/api\/v1\/admin\/resources(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, resourceItem(observed.created), 201);
    }
    return respond(route, {
      data: [resourceItem()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });
  });

  await page.goto('/admin/resources');
  await expect(page.getByRole('heading', { name: 'Resources', level: 1 })).toBeVisible();
  return observed;
}

test('reports each invalid field beside itself rather than in one banner', async ({
  context,
  page,
}) => {
  const observed = await openResourceAdmin(context, page);

  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-describedby', 'title-error');
  await expect(page.getByLabel('File name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Approved file URL')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Description')).toHaveAttribute('aria-invalid', 'true');

  await expect(page.getByLabel('MIME type')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByLabel('Language', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'false',
  );
  expect(observed.created).toBeUndefined();
});

test('moves focus to the first invalid field on submit', async ({ context, page }) => {
  await openResourceAdmin(context, page);

  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.getByLabel('Title')).toBeFocused();
});

test('rejects a file URL that is not a URL at all', async ({ context, page }) => {
  const observed = await openResourceAdmin(context, page);

  await page.getByLabel('Title').fill('Family support guide');
  await page.getByLabel('File name').fill('family.pdf');
  await page.getByLabel('Description').fill('A practical guide for families.');
  await page.getByLabel('Approved file URL').fill('not-a-url');
  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.getByLabel('Approved file URL')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#fileUrl-error')).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.created).toBeUndefined();
});

test('rejects a non-http scheme against the file URL field', async ({ context, page }) => {
  const observed = await openResourceAdmin(context, page);

  await page.getByLabel('Title').fill('Family support guide');
  await page.getByLabel('File name').fill('family.pdf');
  await page.getByLabel('Description').fill('A practical guide for families.');
  await page.getByLabel('Approved file URL').fill('ftp://files.example.org/family.pdf');
  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.locator('#fileUrl-error')).toContainText(/media library/i);
  expect(observed.created).toBeUndefined();
});

test('accepts the approved local storage URL the media library produces', async ({
  context,
  page,
}) => {
  const observed = await openResourceAdmin(context, page);

  await page.getByLabel('Title').fill('Family support guide');
  await page.getByLabel('File name').fill('family.pdf');
  await page.getByLabel('Description').fill('A practical guide for families.');
  await page
    .getByLabel('Approved file URL')
    .fill('http://localhost:9000/nehemiah-media/guides/family.pdf');
  await page.getByLabel('MIME type').selectOption('text/csv');
  await page.getByLabel('Language', { exact: true }).selectOption('am');
  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect.poll(() => observed.created?.title).toBe('Family support guide');
  expect(observed.created).toMatchObject({
    fileName: 'family.pdf',
    fileUrl: 'http://localhost:9000/nehemiah-media/guides/family.pdf',
    mimeType: 'text/csv',
    languageCode: 'am',
  });
});

test('clears the form but keeps the chosen language after a successful create', async ({
  context,
  page,
}) => {
  await openResourceAdmin(context, page);

  await page.getByLabel('Title').fill('Family support guide');
  await page.getByLabel('File name').fill('family.pdf');
  await page.getByLabel('Description').fill('A practical guide for families.');
  await page.getByLabel('Approved file URL').fill('https://media.example.org/family.pdf');
  await page.getByLabel('Language', { exact: true }).selectOption('am');
  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.getByLabel('Title')).toHaveValue('');
  await expect(page.getByLabel('Approved file URL')).toHaveValue('');
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('am');
});

test('clears a field error once the value becomes valid', async ({ context, page }) => {
  const observed = await openResourceAdmin(context, page);

  await page.getByRole('button', { name: 'Create resource draft' }).click();
  await expect(page.locator('#title-error')).toBeVisible();

  await page.getByLabel('Title').fill('Family support guide');
  await page.getByLabel('File name').fill('family.pdf');
  await page.getByLabel('Description').fill('A practical guide for families.');
  await page.getByLabel('Approved file URL').fill('https://media.example.org/family.pdf');
  await page.getByRole('button', { name: 'Create resource draft' }).click();

  await expect(page.locator('#title-error')).toHaveCount(0);
  await expect.poll(() => observed.created?.title).toBe('Family support guide');
});

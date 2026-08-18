import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001401';
const homeId = '00000000-0000-4000-8000-000000001402';
const aboutId = '00000000-0000-4000-8000-000000001403';

const baseItem = {
  label: 'Home',
  url: '/',
  order: 0,
  languageCode: 'en',
  isVisible: true,
  createdBy: adminId,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

type Observed = {
  created?: Record<string, unknown>;
  patched?: Record<string, unknown>;
  deleted?: string;
};

async function openNavigationAdmin(
  context: BrowserContext,
  page: Page,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR' = 'CONTENT_EDITOR',
) {
  const admin = { id: adminId, email: 'admin@example.org', name: 'Administrator', role };
  const observed: Observed = {};
  const items = [
    { ...baseItem, id: homeId },
    { ...baseItem, id: aboutId, label: 'About', url: '/about', order: 10 },
  ];

  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'navigation-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'navigation-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  await page.route(/\/api\/v1\/admin\/navigation(\?|$)/, (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, {
        ...baseItem,
        ...observed.created,
        id: '00000000-0000-4000-8000-000000001404',
      });
    }
    const language = new URL(route.request().url()).searchParams.get('languageCode');
    const data = language === 'am' ? [] : items;
    return respond(route, {
      data,
      meta: { total: data.length, page: 1, limit: 100, totalPages: 1 },
    });
  });

  await page.route(/\/api\/v1\/admin\/navigation\/[0-9a-f-]+$/, (route) => {
    const id = route.request().url().split('/').at(-1)!;
    if (route.request().method() === 'DELETE') {
      observed.deleted = id;
      return respond(route, null);
    }
    observed.patched = route.request().postDataJSON() as Record<string, unknown>;
    const current = items.find((item) => item.id === id)!;
    return respond(route, { ...current, ...observed.patched, updatedAt: '2026-08-11T10:00:00Z' });
  });

  await page.route('**/api/v1/navigation?**', (route) => respond(route, items));

  await page.goto('/admin/navigation');
  await expect(page.getByRole('form', { name: 'Edit Home' })).toBeVisible();
  return observed;
}

test('the new-item form reports each field separately and focuses the first problem', async ({
  context,
  page,
}) => {
  await openNavigationAdmin(context, page);
  const form = page.getByRole('form', { name: 'Add navigation item' });

  await form.getByRole('button', { name: 'Add item' }).click();

  await expect(form.getByText('Label is required.')).toBeVisible();
  await expect(form.getByText('Use an internal /path or an HTTPS URL.')).toBeVisible();
  await expect(page.locator('#new-navigation-label')).toBeFocused();
  await expect(page.locator('#new-navigation-label')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#new-navigation-label')).toHaveAttribute(
    'aria-describedby',
    'new-navigation-label-error',
  );
});

test('a destination must be an internal path or an HTTPS address', async ({ context, page }) => {
  const observed = await openNavigationAdmin(context, page);
  const form = page.getByRole('form', { name: 'Add navigation item' });

  await page.locator('#new-navigation-label').fill('Programs');
  await page.locator('#new-navigation-url').fill('example.com');
  await form.getByRole('button', { name: 'Add item' }).click();
  await expect(form.getByText('Use an internal /path or an HTTPS URL.')).toBeVisible();
  expect(observed.created).toBeUndefined();

  await page.locator('#new-navigation-url').fill('http://example.com');
  await form.getByRole('button', { name: 'Add item' }).click();
  await expect(form.getByText('Use an internal /path or an HTTPS URL.')).toBeVisible();
  expect(observed.created).toBeUndefined();

  await page.locator('#new-navigation-url').fill('/programs');
  await form.getByRole('button', { name: 'Add item' }).click();

  await expect
    .poll(() => observed.created)
    .toMatchObject({
      label: 'Programs',
      url: '/programs',
      languageCode: 'en',
      order: 20,
    });
  await expect(page.locator('#new-navigation-label')).toHaveValue('');
  await expect(page.locator('#new-navigation-url')).toHaveValue('');
});

test('each row owns its own field ids so a label focuses its own input', async ({
  context,
  page,
}) => {
  await openNavigationAdmin(context, page);

  const labelInputs = page.getByLabel('Label', { exact: true });
  await expect(labelInputs).toHaveCount(2);
  const ids = await labelInputs.evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(2);

  const aboutRow = page.getByRole('form', { name: 'Edit About' });
  await aboutRow.locator('label').filter({ hasText: 'Label' }).click();
  await expect(aboutRow.getByLabel('Label', { exact: true })).toBeFocused();
});

test('an invalid row reports inside that row and leaves its neighbour untouched', async ({
  context,
  page,
}) => {
  const observed = await openNavigationAdmin(context, page);
  const homeRow = page.getByRole('form', { name: 'Edit Home' });
  const aboutRow = page.getByRole('form', { name: 'Edit About' });

  await aboutRow.getByLabel('Label', { exact: true }).fill('');
  await aboutRow.getByRole('button', { name: 'Save' }).click();

  await expect(aboutRow.getByText('Label is required.')).toBeVisible();
  await expect(homeRow.getByText('Label is required.')).toHaveCount(0);
  await expect(homeRow.getByLabel('Label', { exact: true })).toHaveValue('Home');
  expect(observed.patched).toBeUndefined();
});

test('a valid row edit sends only that row and keeps the other row editable', async ({
  context,
  page,
}) => {
  const observed = await openNavigationAdmin(context, page);
  const aboutRow = page.getByRole('form', { name: 'Edit About' });

  await aboutRow.getByLabel('Label', { exact: true }).fill('Our story');
  await aboutRow.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Navigation item saved')).toBeVisible();
  expect(observed.patched).toMatchObject({ label: 'Our story', url: '/about' });
  await expect(page.getByRole('form', { name: 'Edit Home' })).toBeVisible();
});

test('a failed row save keeps the typed edits on screen and explains why', async ({
  context,
  page,
}) => {
  await openNavigationAdmin(context, page);
  const aboutRow = page.getByRole('form', { name: 'Edit About' });

  await page.route(/\/api\/v1\/admin\/navigation\/[0-9a-f-]+$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 409,
        message: 'Another navigation item already uses that destination.',
      }),
    }),
  );

  await aboutRow.getByLabel('Label', { exact: true }).fill('Our story');
  await aboutRow.getByRole('button', { name: 'Save' }).click();

  await expect(aboutRow.getByRole('alert')).toContainText('already uses that destination');
  await expect(aboutRow.getByLabel('Label', { exact: true })).toHaveValue('Our story');
});

test('deleting asks for confirmation in an accessible dialog rather than a native prompt', async ({
  context,
  page,
}) => {
  const observed = await openNavigationAdmin(context, page, 'SUPER_ADMIN');
  page.on('dialog', (dialog) => void dialog.dismiss());

  await page
    .getByRole('form', { name: 'Edit About' })
    .getByRole('button', { name: 'Delete' })
    .click();

  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText('Delete navigation item?');
  await expect(confirmation).toContainText('About');
  await confirmation.getByRole('button', { name: 'Delete item' }).click();

  await expect.poll(() => observed.deleted).toBe(aboutId);
  await expect(page.getByRole('form', { name: 'Edit About' })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Edit Home' })).toBeVisible();
});

test('a refused deletion reports the reason and keeps the item listed', async ({
  context,
  page,
}) => {
  await openNavigationAdmin(context, page, 'SUPER_ADMIN');

  await page.route(/\/api\/v1\/admin\/navigation\/[0-9a-f-]+$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 409,
        message: 'The last visible navigation item cannot be deleted.',
      }),
    }),
  );

  await page
    .getByRole('form', { name: 'Edit About' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete item' }).click();

  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'last visible navigation item cannot be deleted',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('form', { name: 'Edit About' })).toBeVisible();
});

test('content editors do not see a delete control at all', async ({ context, page }) => {
  await openNavigationAdmin(context, page, 'CONTENT_EDITOR');
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

test('the stored length limits are enforced while typing', async ({ context, page }) => {
  await openNavigationAdmin(context, page);

  await page.locator('#new-navigation-label').fill('x'.repeat(150));
  await expect(page.locator('#new-navigation-label')).toHaveValue('x'.repeat(100));

  await page.locator('#new-navigation-url').fill('/' + 'y'.repeat(600));
  await expect(page.locator('#new-navigation-url')).toHaveValue('/' + 'y'.repeat(499));
});

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

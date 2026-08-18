import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

const currentAdminId = '00000000-0000-4000-8000-000000001501';
const otherAdminId = '00000000-0000-4000-8000-000000001502';
const createdAdminId = '00000000-0000-4000-8000-000000001503';
const now = '2026-08-01T10:00:00.000Z';

function administrator(
  id: string,
  name: string,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR' | 'FINANCE_VIEWER',
  isActive = true,
  email = `${name.toLowerCase().replaceAll(' ', '.')}@example.org`,
) {
  return { id, name, email, role, isActive, lastLoginAt: null, createdAt: now, updatedAt: now };
}

type Observed = { created?: Record<string, unknown>; patched?: Record<string, unknown> };

async function openAdministrators(context: BrowserContext, page: Page) {
  const admin = {
    id: currentAdminId,
    email: 'root@example.org',
    name: 'Root Administrator',
    role: 'SUPER_ADMIN',
  };
  const observed: Observed = {};
  const admins = [
    administrator(currentAdminId, 'Root Administrator', 'SUPER_ADMIN'),
    administrator(otherAdminId, 'Content Person', 'CONTENT_EDITOR'),
  ];

  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'administrators-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'administrators-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  await page.route(/\/api\/v1\/admin\/users(\?|$)/, (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(
        route,
        administrator(
          createdAdminId,
          String(observed.created.name),
          observed.created.role as 'FINANCE_VIEWER',
          true,
          String(observed.created.email),
        ),
        201,
      );
    }
    return respond(route, {
      data: admins,
      meta: { total: admins.length, page: 1, limit: 10, totalPages: 1 },
    });
  });

  await page.route(/\/api\/v1\/admin\/users\/[0-9a-f-]+$/, (route) => {
    const id = route.request().url().split('/').at(-1)!;
    if (route.request().method() === 'DELETE') return respond(route, null);
    observed.patched = route.request().postDataJSON() as Record<string, unknown>;
    const current = admins.find((entry) => entry.id === id)!;
    return respond(route, { ...current, ...observed.patched, updatedAt: now });
  });

  await page.goto('/admin/users');
  await waitForHydration(page);
  await expect(page.getByRole('form', { name: 'Create administrator' })).toBeVisible();
  return observed;
}

test('the create form reports each field separately instead of one merged sentence', async ({
  context,
  page,
}) => {
  await openAdministrators(context, page);
  const form = page.getByRole('form', { name: 'Create administrator' });

  await form.getByRole('button', { name: 'Create administrator' }).click();

  await expect(form.getByText('Name must contain at least 2 characters.')).toBeVisible();
  await expect(form.getByText('Enter a valid email address.')).toBeVisible();
  await expect(form.getByText('Password must contain at least 12 characters.')).toBeVisible();
  await expect(page.locator('#create-administrator-name')).toBeFocused();
  await expect(page.locator('#create-administrator-email')).toHaveAttribute(
    'aria-describedby',
    'create-administrator-email-error',
  );
});

test('the password policy is stated before a password is rejected', async ({ context, page }) => {
  await openAdministrators(context, page);
  const form = page.getByRole('form', { name: 'Create administrator' });

  await expect(
    form.getByText(
      'At least 12 characters, including an uppercase letter, a lowercase letter and a number.',
    ),
  ).toBeVisible();

  await form.getByLabel('Name').fill('Finance Assistant');
  await form.getByLabel('Email').fill('finance@example.org');
  await form.getByLabel('Temporary password').fill('longenoughbutweak');
  await form.getByRole('button', { name: 'Create administrator' }).click();
  await expect(
    form.getByText('Password must include uppercase, lowercase and numeric characters.'),
  ).toBeVisible();
});

test('a valid account is created and the form is cleared for the next one', async ({
  context,
  page,
}) => {
  const observed = await openAdministrators(context, page);
  const form = page.getByRole('form', { name: 'Create administrator' });

  await form.getByLabel('Name').fill('Finance Assistant');
  await form.getByLabel('Email').fill('finance@example.org');
  await form.getByLabel('Temporary password').fill('StrongPassword123');
  await form.getByLabel('Role').selectOption('FINANCE_VIEWER');
  await form.getByRole('button', { name: 'Create administrator' }).click();

  await expect(page.getByText('Administrator created')).toBeVisible();
  expect(observed.created).toEqual({
    name: 'Finance Assistant',
    email: 'finance@example.org',
    password: 'StrongPassword123',
    role: 'FINANCE_VIEWER',
  });
  await expect(form.getByLabel('Name')).toHaveValue('');
  await expect(form.getByLabel('Temporary password')).toHaveValue('');
  await expect(form.getByLabel('Role')).toHaveValue('CONTENT_EDITOR');
});

test('the password field never leaks its value into the page or storage', async ({
  context,
  page,
}) => {
  await openAdministrators(context, page);
  const form = page.getByRole('form', { name: 'Create administrator' });
  const password = form.getByLabel('Temporary password');

  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'new-password');

  await password.fill('StrongPassword123');
  const stored = await page.evaluate(() =>
    JSON.stringify({ local: Object.values(localStorage), session: Object.values(sessionStorage) }),
  );
  expect(stored).not.toContain('StrongPassword123');
});

test('the update form loads the selected account and marks it for assistive technology', async ({
  context,
  page,
}) => {
  await openAdministrators(context, page);
  const entry = page.getByRole('button', { name: /Content Person/ });

  await expect(entry).not.toHaveAttribute('aria-current', 'true');
  await entry.click();
  await expect(entry).toHaveAttribute('aria-current', 'true');

  const form = page.getByRole('form', { name: 'Update Content Person' });
  await expect(form.getByLabel('Name')).toHaveValue('Content Person');
  await expect(form.getByLabel('Role')).toHaveValue('CONTENT_EDITOR');
  await expect(form.getByLabel('Account active')).toBeChecked();
  await expect(form.getByLabel('New password (optional)')).toHaveValue('');
});

test('an empty update password means keep the current one, a typed one must satisfy the policy', async ({
  context,
  page,
}) => {
  const observed = await openAdministrators(context, page);
  await page.getByRole('button', { name: /Content Person/ }).click();
  const form = page.getByRole('form', { name: 'Update Content Person' });

  await form.getByLabel('New password (optional)').fill('short');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form.getByText('Password must contain at least 12 characters.')).toBeVisible();
  expect(observed.patched).toBeUndefined();

  await form.getByLabel('New password (optional)').fill('');
  await form.getByLabel('Name').fill('Content Lead');
  await form.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Administrator updated')).toBeVisible();
  expect(observed.patched).toEqual({
    name: 'Content Lead',
    role: 'CONTENT_EDITOR',
    isActive: true,
  });
});

test('a typed update password is sent only when it satisfies the policy', async ({
  context,
  page,
}) => {
  const observed = await openAdministrators(context, page);
  await page.getByRole('button', { name: /Content Person/ }).click();
  const form = page.getByRole('form', { name: 'Update Content Person' });

  await form.getByLabel('New password (optional)').fill('ReplacementPass9');
  await form.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Administrator updated')).toBeVisible();
  expect(observed.patched).toMatchObject({ password: 'ReplacementPass9' });
});

test('deactivating an account is sent as a boolean the backend can act on', async ({
  context,
  page,
}) => {
  const observed = await openAdministrators(context, page);
  await page.getByRole('button', { name: /Content Person/ }).click();
  const form = page.getByRole('form', { name: 'Update Content Person' });

  await form.getByLabel('Account active').uncheck();
  await form.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('Administrator updated')).toBeVisible();
  expect(observed.patched).toMatchObject({ isActive: false });
});

test('administrators cannot delete the account they are signed in with', async ({
  context,
  page,
}) => {
  await openAdministrators(context, page);
  await page.getByRole('button', { name: /Root Administrator/ }).click();
  const form = page.getByRole('form', { name: 'Update Root Administrator' });

  await expect(form.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await expect(page.getByText('You cannot delete the account currently in use.')).toBeVisible();
});

test('a refused deletion explains the reason inside the confirmation dialog', async ({
  context,
  page,
}) => {
  await openAdministrators(context, page);
  await page.getByRole('button', { name: /Content Person/ }).click();

  await page.route(/\/api\/v1\/admin\/users\/[0-9a-f-]+$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 409,
        message: 'The final active super administrator cannot be deleted.',
      }),
    }),
  );

  await page
    .getByRole('form', { name: 'Update Content Person' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete administrator' }).click();

  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'final active super administrator cannot be deleted',
  );
});

test('the account filters describe what they filter', async ({ context, page }) => {
  await openAdministrators(context, page);

  await expect(page.getByLabel('Filter by role')).toBeVisible();
  await expect(page.getByLabel('Filter by account status')).toBeVisible();
  await expect(page.getByLabel('Filter by role')).toHaveValue('');
});

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: status,
      timestamp: new Date(0).toISOString(),
    }),
  });
}

import { expect, test, type Page } from '@playwright/test';

const superAdministrator = {
  id: 'admin-super',
  email: 'admin@example.org',
  name: 'Super Administrator',
  role: 'SUPER_ADMIN',
} as const;

test('unauthenticated administrator routes redirect to sign in', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
});

test('login, reload refresh, current-admin bootstrap, and logout use no browser token storage', async ({
  page,
  context,
}) => {
  const calls = await mockAuthentication(page, superAdministrator);
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(superAdministrator.email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Administration dashboard' })).toBeVisible();
  expect(calls.login).toBe(1);
  expect(calls.refresh).toBeGreaterThanOrEqual(1);
  expect(calls.me).toBeGreaterThanOrEqual(1);
  await expectNoStoredTokens(page);

  const cookie = (await context.cookies()).find(({ name }) => name === 'nac-admin-refresh');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('nac-admin-refresh');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Administration dashboard' })).toBeVisible();
  expect(calls.refresh).toBeGreaterThanOrEqual(2);
  await expectNoStoredTokens(page);

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(calls.logout).toBe(1);
  expect((await context.cookies()).some(({ name }) => name === 'nac-admin-refresh')).toBe(false);
});

test('login validation, locked-account messaging, and rate-limit messaging are controlled', async ({
  page,
}) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 429,
        message: 'Too many login attempts. Try again later.',
      }),
    }),
  );
  await page.goto('/admin/login');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  await page.getByLabel('Email address').fill(superAdministrator.email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText(/account is temporarily locked/i)).toBeVisible();
});

test('password recovery is generic and a consumed reset token leaves browser history', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/password-reset/request', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: successEnvelope({
        message: 'If the account exists, password reset instructions have been sent.',
      }),
    }),
  );
  await page.goto('/admin/forgot-password');
  await page.getByLabel('Administrator email').fill('unknown@example.org');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(page.getByRole('status')).toContainText('If the account exists');

  const token = 'a'.repeat(64);
  await page.route('**/api/v1/auth/password-reset/confirm', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: successEnvelope({ message: 'Password has been reset successfully.' }),
    }),
  );
  await page.goto(`/admin/reset-password?token=${token}`);
  await page.getByLabel('New password', { exact: true }).fill('NewStrongPassword123');
  await page.getByLabel('Confirm new password').fill('NewStrongPassword123');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page).toHaveURL(/\/admin\/login\?reset=success$/);
  expect(page.url()).not.toContain(token);
  await page.goBack();
  expect(page.url()).not.toContain(token);
});

test('a wrong-role administrator is redirected away from system administration', async ({
  page,
}) => {
  const financeViewer = {
    ...superAdministrator,
    id: 'admin-finance',
    role: 'FINANCE_VIEWER' as const,
  };
  await mockAuthentication(page, financeViewer);
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(financeViewer.email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/system');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(
    page.getByRole('heading', { name: 'Your role cannot access this section' }),
  ).toBeVisible();
});

async function mockAuthentication(
  page: Page,
  admin: {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'CONTENT_EDITOR' | 'FINANCE_VIEWER';
  },
) {
  const calls = { login: 0, refresh: 0, me: 0, logout: 0 };
  await page.route('**/api/auth/login', async (route) => {
    calls.login += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': refreshCookie('refresh-login') },
      body: successEnvelope({ accessToken: 'access-login', expiresIn: 900, admin }),
    });
  });
  await page.route('**/api/auth/refresh', async (route) => {
    calls.refresh += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': refreshCookie(`refresh-${calls.refresh}`) },
      body: successEnvelope({ accessToken: `access-${calls.refresh}`, expiresIn: 900, admin }),
    });
  });
  await page.route('**/api/auth/logout', async (route) => {
    calls.logout += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie': 'nac-admin-refresh=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      },
      body: successEnvelope({ message: 'Logged out successfully' }),
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    calls.me += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: successEnvelope(admin),
    });
  });
  return calls;
}

async function expectNoStoredTokens(page: Page) {
  const storage = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(window.localStorage)),
    session: Object.fromEntries(Object.entries(window.sessionStorage)),
  }));
  expect(JSON.stringify(storage)).not.toMatch(/access-|refresh-|token/i);
}

function refreshCookie(value: string) {
  return `nac-admin-refresh=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`;
}

function successEnvelope(data: unknown) {
  return JSON.stringify({
    success: true,
    data,
    statusCode: 200,
    timestamp: new Date(0).toISOString(),
  });
}

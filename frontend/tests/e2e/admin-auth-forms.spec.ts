import { expect, test, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

const administrator = {
  id: '00000000-0000-4000-8000-000000001801',
  email: 'admin@example.org',
  name: 'Super Administrator',
  role: 'SUPER_ADMIN',
} as const;

const validToken = 'a'.repeat(64);

test('a field error is announced as a description, not as the name of the field', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await waitForHydration(page);
  await page.getByRole('button', { name: 'Sign In' }).click();

  const password = page.locator('#password');
  // The error used to sit inside the label element, which made it part of the
  // accessible name and changed that name on every validation pass.
  await expect(password).toHaveAccessibleName('Password');
  await expect(password).toHaveAttribute('aria-describedby', 'password-error');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#password-error')).toHaveText(
    'Password must contain at least 8 characters.',
  );
  await expect(page.locator('#password-error')).toHaveRole('alert');
});

test('a resolved field drops both its error and its description', async ({ page }) => {
  await page.goto('/admin/login');
  await waitForHydration(page);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('#email-error')).toBeVisible();

  await page.getByLabel('Email address').fill('admin@example.org');
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.locator('#email-error')).toHaveCount(0);
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#email')).not.toHaveAttribute('aria-describedby', /./);
});

test('the password policy is attached to the field it governs, before anything fails', async ({
  page,
}) => {
  await page.goto(`/admin/reset-password?token=${validToken}`);
  await waitForHydration(page);

  const newPassword = page.locator('#newPassword');
  await expect(newPassword).toHaveAttribute('aria-describedby', 'newPassword-hint');
  await expect(page.locator('#newPassword-hint')).toHaveText(
    'Use at least 12 characters, including an uppercase letter, a lowercase letter, and a number.',
  );
  await expect(newPassword).toHaveAccessibleName('New password');
});

test('a rejected password replaces its guidance with the reason it was rejected', async ({
  page,
}) => {
  await page.goto(`/admin/reset-password?token=${validToken}`);
  await waitForHydration(page);

  await page.locator('#newPassword').fill('alllowercase123');
  await page.locator('#confirmPassword').fill('alllowercase123');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page.locator('#newPassword-error')).toHaveText(
    'Password must include an uppercase letter.',
  );
  await expect(page.locator('#newPassword')).toHaveAttribute(
    'aria-describedby',
    'newPassword-error',
  );
  await expect(page.locator('#newPassword-hint')).toHaveCount(0);
});

test('mismatched passwords are reported on the confirmation field', async ({ page }) => {
  let confirmed = false;
  await page.route('**/api/v1/auth/password-reset/confirm', (route) => {
    confirmed = true;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null, statusCode: 200 }),
    });
  });

  await page.goto(`/admin/reset-password?token=${validToken}`);
  await waitForHydration(page);
  await page.locator('#newPassword').fill('StrongPassword123');
  await page.locator('#confirmPassword').fill('DifferentPassword123');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page.locator('#confirmPassword-error')).toHaveText('Passwords do not match.');
  await expect(page.locator('#newPassword')).toHaveAttribute('aria-invalid', 'false');
  expect(confirmed).toBe(false);
});

test('focus follows the confirmation when the request form is replaced', async ({ page }) => {
  await page.route('**/api/v1/auth/password-reset/request', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null, statusCode: 200 }),
    }),
  );

  await page.goto('/admin/forgot-password');
  await waitForHydration(page);
  await page.getByLabel('Administrator email').fill('admin@example.org');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();

  // The submit button is unmounted with the form, so without this the caret would
  // fall back to the document body and a keyboard user would lose their place.
  const confirmation = page.getByRole('status');
  await expect(confirmation).toContainText('If the account exists');
  await expect(confirmation).toBeFocused();
});

test('an incomplete reset link explains itself and offers a way forward', async ({ page }) => {
  await page.goto('/admin/reset-password?token=too-short');
  await waitForHydration(page);

  // Next.js renders an empty role=alert route announcer, so the assertion targets
  // the message rather than "the alert".
  await expect(
    page.getByRole('alert').filter({ hasText: 'This reset link is invalid or incomplete.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  await expect(page.locator('#newPassword')).toHaveCount(0);
});

test('a completed reset is acknowledged on the sign-in page', async ({ page }) => {
  await page.goto('/admin/login?reset=success');
  await waitForHydration(page);

  await expect(page.getByRole('status')).toContainText('Your password was reset.');
});

test('the post-sign-in destination only follows administrator paths', async ({ page }) => {
  await mockSignIn(page);

  await page.goto('/admin/login?next=https://example.com/phish');
  await waitForHydration(page);
  await page.getByLabel('Email address').fill(administrator.email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/localhost:3000\/admin$/, { timeout: 30_000 });
});

test('a legitimate administrator destination is preserved', async ({ page }) => {
  await mockSignIn(page);

  await page.goto('/admin/login?next=%2Fadmin%2Fcontent');
  await waitForHydration(page);
  await page.getByLabel('Email address').fill(administrator.email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/admin\/content$/, { timeout: 30_000 });
});

async function mockSignIn(page: Page) {
  const session = { accessToken: 'access-token', expiresIn: 900, admin: administrator };
  const cookie = 'nac-admin-refresh=refresh-token; HttpOnly; SameSite=Strict; Path=/; Max-Age=900';
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': cookie },
      body: envelope(session),
    }),
  );
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': cookie },
      body: envelope(session),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, administrator));
  await page.route(/\/api\/v1\/admin\/(dashboard|cms)/, (route) =>
    respond(route, { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
  );
}

function envelope(data: unknown) {
  return JSON.stringify({
    success: true,
    data,
    statusCode: 200,
    timestamp: new Date(0).toISOString(),
  });
}

function respond(route: Route, data: unknown) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data) });
}

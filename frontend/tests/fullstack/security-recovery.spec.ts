import { expect, test } from '@playwright/test';
import { apiUrl, backendLogin, login, waitForLatestMail } from './fullstack.helpers';

const replacementPassword = 'E2eRecoveryPassword456!';

test('@extended password recovery consumes a real Mailpit link and signs in with the new password', async ({
  page,
  request,
}) => {
  const email = 'e2e-recovery@nehemiah.test';
  await page.goto('/admin/forgot-password');
  await page.getByLabel('Administrator email').fill(email);
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(page.getByRole('status')).toContainText('If the account exists');

  const message = await waitForLatestMail(request, /Reset your password:/);
  const resetUrl = message.match(/https?:\/\/[^\s]+\/admin\/reset-password\?token=[a-f0-9]{64}/i)?.[0];
  expect(resetUrl).toBeTruthy();
  const token = new URL(resetUrl!).searchParams.get('token');

  await page.goto(`/admin/reset-password?token=${token}`);
  await page.getByLabel('New password', { exact: true }).fill(replacementPassword);
  await page.getByLabel('Confirm new password').fill(replacementPassword);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page).toHaveURL(/\/admin\/login\?reset=success$/);
  expect(page.url()).not.toContain(token!);

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(replacementPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /E2E Password Recovery/ })).toBeVisible();
});

test('@extended revoking one real device session immediately rejects that device', async ({
  page,
  request,
}) => {
  const email = 'e2e-security@nehemiah.test';
  await login(page, email);
  const secondary = await backendLogin(
    request,
    email,
    undefined,
    'NAC E2E secondary security device',
  );
  await page.goto('/admin/sessions');
  await page.getByPlaceholder('Administrator UUID').fill(secondary.admin.id);
  await page.getByRole('button', { name: 'Apply filter' }).click();
  const session = page
    .locator('li')
    .filter({ hasText: 'NAC E2E secondary security device' })
    .first();
  await expect(session).toBeVisible();
  await session.getByRole('button', { name: 'Revoke device' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke session' }).click();
  await expect(page.getByText('1 session revoked.')).toBeVisible();

  const rejected = await request.get(`${apiUrl}/auth/me`, {
    headers: { authorization: `Bearer ${secondary.accessToken}` },
  });
  expect(rejected.status()).toBe(401);
});

import { expect, test } from '@playwright/test';

const password = 'E2eStrongPassword123!';

test('super administrator reaches security and operations workspaces', async ({ page }) => {
  await login(page, 'e2e-super@nehemiah.test');
  await expect(page.getByRole('navigation', { name: 'Administrator navigation' })).toContainText(
    'Administrators',
  );
  await page.goto('/admin/system');
  await expect(page.getByRole('heading', { name: 'System administration' })).toBeVisible();
  await expect(page.getByText(/PostgreSQL/).first()).toBeVisible();
  await expect(page.getByText(/Redis/).first()).toBeVisible();
});

test('content editor reaches content tools but not financial data', async ({ page }) => {
  await login(page, 'e2e-editor@nehemiah.test');
  const navigation = page.getByRole('navigation', { name: 'Administrator navigation' });
  await expect(navigation).toContainText('CMS pages');
  await expect(navigation).not.toContainText('Donations');
  await page.goto('/admin/donations');
  await expect(page.getByRole('heading', { name: /role cannot access/i })).toBeVisible();
});

test('finance viewer reaches donations but not content tools', async ({ page }) => {
  await login(page, 'e2e-finance@nehemiah.test');
  const navigation = page.getByRole('navigation', { name: 'Administrator navigation' });
  await expect(navigation).toContainText('Donations');
  await expect(navigation).not.toContainText('Content');
  await page.goto('/admin/content');
  await expect(page.getByRole('heading', { name: /role cannot access/i })).toBeVisible();
});

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin$/, { timeout: 60_000, waitUntil: 'domcontentloaded' });
}

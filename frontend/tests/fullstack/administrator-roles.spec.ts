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

test('content editor creates and publishes a page through the real administration UI', async ({
  page,
}) => {
  const slug = `e2e-published-${Date.now()}`;
  await login(page, 'e2e-editor@nehemiah.test');
  await page.goto('/admin/content/new');
  await page.getByLabel('Title').fill('E2E published family support');
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Page content').fill('Published by the disposable full-stack test.');
  await page.getByRole('button', { name: 'Create draft' }).click();

  await page.waitForURL(/\/admin\/content\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Edit E2E published family support' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();

  await page.goto(`/${slug}?lang=en`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'E2E published family support' }),
  ).toBeVisible();
  await expect(page.getByText('Published by the disposable full-stack test.')).toBeVisible();
});

test('super administrator updates settings and runs an audited cache mutation', async ({ page }) => {
  await login(page, 'e2e-super@nehemiah.test');
  await page.goto('/admin/settings');
  await page.getByLabel('Address').fill('Addis Ababa, Ethiopia — verified by E2E');
  await page.getByRole('button', { name: 'Save public settings' }).click();
  await expect(page.getByText('Global settings saved')).toBeVisible();

  await page.goto('/admin/system');
  await page.getByRole('button', { name: 'Warm cache' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Warm application cache?' });
  await confirmation.getByRole('button', { name: 'Warm cache' }).click();
  await expect(page.getByText('Application cache warmed')).toBeVisible();
});

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin$/, { timeout: 60_000, waitUntil: 'domcontentloaded' });
}

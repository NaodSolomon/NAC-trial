import { expect, test } from '@playwright/test';
import { apiUrl, backendLogin, login } from './fullstack.helpers';

test('@extended cache clear and warm execute against real Redis with audited feedback', async ({
  page,
}) => {
  await login(page, 'e2e-super@nehemiah.test');
  await page.goto('/admin/system');

  await page.getByRole('button', { name: 'Clear cache' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear cache' }).click();
  await expect(page.getByText('Application cache cleared')).toBeVisible();

  await page.getByRole('button', { name: 'Warm cache' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Warm cache' }).click();
  await expect(page.getByText('Application cache warmed')).toBeVisible();
  await expect(page.getByText('Maintenance action completed successfully.')).toBeVisible();
});

test('@extended search reindex preserves search and exposes a real advisory-lock conflict', async ({
  page,
  request,
}) => {
  await login(page, 'e2e-super@nehemiah.test');
  await page.goto('/admin/system');
  const maintenanceSession = await backendLogin(request, 'e2e-super@nehemiah.test');
  const firstReindex = request.post(`${apiUrl}/admin/system/search/reindex`, {
    headers: { authorization: `Bearer ${maintenanceSession.accessToken}` },
  });
  await new Promise((resolve) => setTimeout(resolve, 250));

  await page.getByRole('button', { name: 'Reindex search' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start rebuild' }).click();
  await expect(page.getByText(/Another search-index rebuild is already running/)).toBeVisible({
    timeout: 15_000,
  });
  expect((await firstReindex).status()).toBe(200);

  await page.goto('/search?lang=en&q=autism');
  await expect(page.getByRole('status').filter({ hasText: /results for/i })).toBeVisible();
});

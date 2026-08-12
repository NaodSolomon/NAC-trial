import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
});

test('initial response declares the requested language before hydration', async ({ page }) => {
  const amharicResponse = await page.goto('/about?lang=am');
  expect(await amharicResponse?.text()).toContain('<html lang="am"');

  const adminResponse = await page.goto('/admin/login?lang=am');
  expect(await adminResponse?.text()).toContain('<html lang="en"');
});

test('public shell supports keyboard navigation and the skip link', async ({ page }) => {
  await page.goto('/');

  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await skipLink.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});

test('language remains selected across public routes and reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language').first().selectOption('am');
  await expect(page).toHaveURL(/lang=am/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');

  await page.getByRole('link', { name: 'ስለ እኛ', exact: true }).first().click();
  await expect(page).toHaveURL(/\/about\?lang=am/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.getByLabel('ቋንቋ').first()).toHaveValue('am');
});

test('shell remains stable while API data loads and fits a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');

  const initialHeight = await page
    .locator('[data-public-header]')
    .evaluate((element) => element.getBoundingClientRect().height);
  await page.waitForTimeout(350);
  const settledHeight = await page
    .locator('[data-public-header]')
    .evaluate((element) => element.getBoundingClientRect().height);

  expect(settledHeight).toBe(initialHeight);
  const horizontalScroll = await page.evaluate(() => {
    window.scrollTo({ left: 1_000, top: 0 });
    return window.scrollX;
  });
  expect(horizontalScroll).toBe(0);
});

test('manual high contrast preference is retained after navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'High contrast' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  await page.goto('/events');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
});

async function mockPublicShellApi(page: Page) {
  await page.route('**/api/v1/navigation**', async (route) => {
    const language = new URL(route.request().url()).searchParams.get('languageCode');
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        statusCode: 200,
        timestamp: new Date(0).toISOString(),
        data:
          language === 'am'
            ? [
                { id: 'home-am', label: 'መነሻ', url: '/' },
                { id: 'about-am', label: 'ስለ እኛ', url: '/about' },
              ]
            : [
                { id: 'home-en', label: 'Home', url: '/' },
                { id: 'about-en', label: 'About us', url: '/about' },
              ],
      }),
    });
  });
  await page.route('**/api/v1/settings', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        statusCode: 200,
        timestamp: new Date(0).toISOString(),
        data: {
          siteName: 'Nehemiah Autism Center',
          defaultLanguage: 'en',
          supportedLanguages: ['en', 'am'],
          contactEmail: 'hello@example.org',
          phone: '+251 11 000 0000',
          address: 'Addis Ababa, Ethiopia',
        },
      }),
    });
  });
}

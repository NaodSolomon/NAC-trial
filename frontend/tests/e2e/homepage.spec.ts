import { expect, test } from '@playwright/test';

test('seeded API content renders a complete server homepage', async ({ page }) => {
  const response = await page.goto('/?lang=en');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Every child deserves understanding, support, and opportunity',
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How we support families' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming events' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest stories' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent moments' })).toBeVisible();
});

test('Amharic composition is selected by the language query', async ({ page }) => {
  await page.goto('/?lang=am');

  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.locator('main h1')).toHaveText('እያንዳንዱ ልጅ መረዳትና ድጋፍ ይገባዋል');
  await expect(page.getByRole('link', { name: /Contact us/i })).toHaveCount(0);
});

test('homepage exposes social metadata from CMS content', async ({ page }) => {
  await page.goto('/?lang=en');

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Nehemiah Autism Center | Autism Support in Ethiopia',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\?lang=en$/);
});

test('primary CMS content is present in the server HTML before hydration', async ({ request }) => {
  const response = await request.get('/?lang=en');
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html).toContain('Every child deserves understanding, support, and opportunity');
  expect(html).toContain('Practical information and support for parents and caregivers.');
});

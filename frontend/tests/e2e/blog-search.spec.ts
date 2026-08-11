import { expect, test } from '@playwright/test';

test('blog listing is published-only and keeps pagination in the URL', async ({ page }) => {
  await page.goto('/blog?lang=en');

  await expect(
    page.getByRole('heading', { level: 2, name: 'How your support changes lives' }),
  ).toBeVisible();
  await expect(page.getByText('Private draft article')).toHaveCount(0);
  await page.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/blog\?page=2&lang=en$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Community story 7' })).toBeVisible();
});

test('blog detail includes share metadata and valid BlogPosting structured data', async ({
  page,
}) => {
  await page.goto('/blog/how-your-donations-change-lives?lang=en');

  await expect(
    page.getByRole('heading', { level: 1, name: 'How your support changes lives' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Facebook' })).toHaveAttribute('rel', /noopener/);
  const structuredEntries = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const jsonLd = structuredEntries
    .map((value) => JSON.parse(value) as Record<string, unknown>)
    .find((value) => value['@type'] === 'BlogPosting');
  if (!jsonLd) throw new Error('BlogPosting structured data was not rendered.');
  expect(jsonLd).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'How your support changes lives',
    inLanguage: 'en',
  });
  expect(jsonLd.datePublished).toBeTruthy();
  expect(jsonLd.mainEntityOfPage).toContain('/blog/how-your-donations-change-lives?lang=en');
});

test('an unpublished or unknown blog slug returns not found', async ({ page }) => {
  await page.goto('/blog/private-draft-article?lang=en');

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByText('Private draft article')).toHaveCount(0);
});

test('search uses a shareable URL and groups safe published results', async ({ page }) => {
  await page.goto('/search?lang=en');
  const input = page.getByRole('searchbox', { name: 'Search term' });
  await input.fill('support');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/search\?lang=en&q=support$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Pages' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Events' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Blog posts' })).toBeVisible();
  await expect(page.getByText('draft-secret')).toHaveCount(0);
  await expect(page.getByText('Private draft article')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('3 results for');
});

test('search reports missing and invalid URL queries without requesting results', async ({
  page,
}) => {
  let searchRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/public/search') searchRequests += 1;
  });

  await page.goto('/search?lang=en');
  await expect(page.getByRole('status')).toContainText('Enter at least two characters');
  await page.goto('/search?lang=en&q=x');
  await expect(page.getByRole('alert')).toContainText('between 2 and 100 characters');
  expect(searchRequests).toBe(0);
});

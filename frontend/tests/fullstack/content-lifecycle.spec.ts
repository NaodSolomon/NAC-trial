import { expect, test } from '@playwright/test';
import { apiUrl, createCmsDraft, localDateTimeValue, login } from './fullstack.helpers';

test('@extended scheduled content is private and is automatically published by the real scheduler', async ({
  page,
  request,
}) => {
  const run = Date.now();
  const title = `Scheduled E2E page ${run}`;
  const slug = `scheduled-e2e-${run}`;
  await login(page, 'e2e-editor@nehemiah.test');
  await createCmsDraft(page, title, slug, 'Automatically published by the Docker-backed scheduler.');

  await page.getByRole('button', { name: 'Schedule' }).click();
  await page
    .getByLabel('Local publication date and time')
    .fill(localDateTimeValue(new Date(Date.now() + 45_000)));
  await page.getByRole('button', { name: 'Confirm schedule' }).click();
  await expect(page.getByText('SCHEDULED', { exact: true })).toBeVisible();

  const publicContentUrl = `${apiUrl}/public/pages/${slug}?languageCode=en`;
  const hidden = await request.get(publicContentUrl);
  expect(hidden.status()).toBe(404);
  await expect
    .poll(async () => (await request.get(publicContentUrl)).status(), {
      timeout: 60_000,
      intervals: [1_000],
    })
    .toBe(200);

  await page.goto(`/${slug}?lang=en`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});

test('@extended SEO updates are visible publicly only after real CMS publication', async ({
  page,
  request,
}) => {
  const run = Date.now();
  const title = `SEO source page ${run}`;
  const seoTitle = `Verified autism support ${run}`;
  const seoDescription = 'A real-service SEO description verified through the public route.';
  const slug = `seo-e2e-${run}`;
  await login(page, 'e2e-editor@nehemiah.test');
  await createCmsDraft(page, title, slug, 'Searchable full-stack content for families.');

  await page.goto('/admin/seo');
  const selector = page.getByLabel('CMS page');
  const option = selector.locator('option').filter({ hasText: title });
  await expect(option).toHaveCount(1);
  await selector.selectOption((await option.getAttribute('value'))!);
  await page.getByLabel('SEO title').fill(seoTitle);
  await page.getByLabel('SEO description').fill(seoDescription);
  await page.getByLabel(/Keywords/).fill('autism, families, ethiopia');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();
  await expect(page.getByText('SEO metadata saved')).toBeVisible();

  const draftResponse = await request.get(`${apiUrl}/public/seo/${slug}?languageCode=en`);
  expect(draftResponse.status()).toBe(404);

  await page.goto('/admin/content');
  const row = page.getByRole('row').filter({ hasText: title });
  await row.getByRole('link', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();

  await page.goto(`/${slug}?lang=en`);
  await expect(page).toHaveTitle(new RegExp(seoTitle));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', seoDescription);
  await page.goto(`/search?lang=en&q=${encodeURIComponent(title)}`);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
});

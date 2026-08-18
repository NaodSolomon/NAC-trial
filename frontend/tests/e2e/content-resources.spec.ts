import { expect, test } from '@playwright/test';

test('about renders only the published, sanitized CMS response', async ({ page }) => {
  await page.goto('/about?lang=en');

  await expect(
    page.getByRole('heading', { level: 1, name: 'About Nehemiah Autism Center' }),
  ).toBeVisible();
  await expect(
    page.getByText('Nehemiah Autism Center provides family-centered autism support in Ethiopia.'),
  ).toBeVisible();
  await expect(page.getByText('draft-secret')).toHaveCount(0);
});

test('a published generic CMS slug renders sanitized localized content and SEO', async ({
  page,
}) => {
  await page.goto('/services?lang=en');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Family Support Services' }),
  ).toBeVisible();
  await expect(page.getByText(/Practical support for every family/)).toBeVisible();
  await expect(page.getByText('private-draft-note')).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Autism Family Support Services',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/services\?lang=en$/,
  );

  await page.goto('/services?lang=am');
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.getByRole('heading', { level: 1, name: 'የቤተሰብ ድጋፍ አገልግሎቶች' })).toBeVisible();
});

test('an unpublished or unknown generic CMS slug returns not found', async ({ page }) => {
  await page.goto('/draft-program?lang=en');

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByText('private-draft-note')).toHaveCount(0);
});

test('FAQ accordion exposes keyboard-operable expanded state', async ({ page }) => {
  await page.goto('/faq?lang=en');
  const question = page.getByRole('button', { name: 'What does the center do?' });

  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('We provide practical, family-centered autism support.'),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(question).toHaveAttribute('aria-expanded', 'false');
});

test('resource filters do not count downloads and rapid activation counts once', async ({
  page,
}) => {
  let downloadRequests = 0;
  page.on('request', (request) => {
    if (/\/public\/resources\/[^/]+\/download$/.test(new URL(request.url()).pathname)) {
      downloadRequests += 1;
    }
  });
  await page.addInitScript(() => {
    HTMLAnchorElement.prototype.click = () => undefined;
  });
  await page.goto('/resources?lang=en');

  await page.getByRole('button', { name: 'PDF' }).click();
  await expect(page.getByText('Family autism guide')).toBeVisible();
  await expect(page.getByText('Activity planner')).toHaveCount(0);
  expect(downloadRequests).toBe(0);

  await page.getByRole('button', { name: 'Download' }).dblclick();
  await expect(page.getByText('3 downloads')).toBeVisible();
  expect(downloadRequests).toBe(1);
});

test('resources provide a localized empty state', async ({ page }) => {
  await page.goto('/resources?lang=am');
  await expect(page.getByRole('status')).toContainText('ግብዓቶች በቅርቡ ይታከላሉ');
});

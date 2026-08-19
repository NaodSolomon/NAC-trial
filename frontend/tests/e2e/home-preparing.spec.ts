import { expect, test } from '@playwright/test';
import { API_ORIGIN } from '../helpers/test-endpoints';

// The homepage is server-rendered, so page.route cannot intercept its API call;
// the mock API server exposes a test-only toggle instead.
async function setHomepageUnpublished(
  request: import('@playwright/test').APIRequestContext,
  value: boolean,
) {
  const response = await request.post(`${API_ORIGIN}/__test/homepage-unpublished?value=${value}`);
  expect(response.ok()).toBe(true);
}

test('an unpublished homepage renders a placeholder, not an error page', async ({
  page,
  request,
}) => {
  await setHomepageUnpublished(request, true);
  try {
    const response = await page.goto('/?lang=en');

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'This website is being prepared' }),
    ).toBeVisible();
    await expect(page.getByText('Content will be published here soon.')).toBeVisible();
    // The public shell must survive the empty state: this is a page, not a crash.
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByText('This page is temporarily unavailable')).toHaveCount(0);
    await expect(page).toHaveTitle(/Nehemiah Autism Center/);
  } finally {
    await setHomepageUnpublished(request, false);
  }
});

test('the placeholder is localized for Amharic readers', async ({ page, request }) => {
  await setHomepageUnpublished(request, true);
  try {
    await page.goto('/?lang=am');
    await expect(page.getByRole('heading', { name: 'ይህ ድረ-ገጽ በዝግጅት ላይ ነው' })).toBeVisible();
  } finally {
    await setHomepageUnpublished(request, false);
  }
});

test('the homepage still renders normally once published again', async ({ page, request }) => {
  await setHomepageUnpublished(request, false);
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText(
    'This website is being prepared',
  );
});

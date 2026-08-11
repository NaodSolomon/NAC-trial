import { expect, test } from '@playwright/test';

test('public metadata, structured data, and analytics preserve privacy', async ({ page }) => {
  const analyticsPayloads: unknown[] = [];
  await page.route('**/api/v1/public/analytics/events', async (route) => {
    analyticsPayloads.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/?lang=en&utm_source=private-campaign');
  await expect(
    page.getByRole('heading', {
      name: 'Every child deserves understanding, support, and opportunity',
    }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'http://localhost:3000/?lang=en',
  );
  await expect(page.locator('link[hreflang="am"]')).toHaveAttribute(
    'href',
    'http://localhost:3000/?lang=am',
  );
  await expect
    .poll(() => analyticsPayloads.length)
    .toBeGreaterThan(0);
  expect(analyticsPayloads[0]).toEqual({
    eventType: 'page_view',
    pageUrl: '/',
    deviceType: 'desktop',
  });
  expect(JSON.stringify(analyticsPayloads)).not.toContain('private-campaign');
  expect(JSON.stringify(analyticsPayloads)).not.toContain('referrer');

  const organization = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(JSON.parse(organization ?? '{}')['@type']).toBe('Organization');

  await page.goto('/events/family-support-day?lang=en');
  const structuredEntries = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(structuredEntries.map((value) => JSON.parse(value)['@type'])).toContain('Event');
});

test('sitemap contains published API content and robots exclude private routes', async ({
  request,
}) => {
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain('/blog/how-your-donations-change-lives?lang=en');
  expect(sitemap).toContain('/events/family-support-day?lang=am');
  expect(sitemap).not.toContain('/admin');
  expect(sitemap).not.toContain('DRAFT');

  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Disallow: /admin/');
  expect(robots).toContain('Sitemap: http://localhost:3000/sitemap.xml');
});

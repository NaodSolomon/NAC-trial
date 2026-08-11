import { expect, test } from '@playwright/test';

const administrator = {
  id: 'admin-visual-super',
  email: 'admin@example.org',
  name: 'Super Administrator',
  role: 'SUPER_ADMIN',
} as const;

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'visual-refresh-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ accessToken: 'visual-access-token', expiresIn: 900, admin: administrator }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: envelope(administrator) }),
  );
  await page.route('**/api/v1/admin/analytics/summary', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        totalVisitors: 1248,
        topCountries: [{ country: 'ET', visits: 900 }],
        topPages: [{ route: '/', visits: 720 }],
      }),
    }),
  );
  await page.route('**/api/v1/admin/donations/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        totalDonations: 18,
        totals: [{ currency: 'USD', amount: '1250.00' }],
      }),
    }),
  );
});

test('administrator shell matches the responsive workspace baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await expect(page.getByText('Page views')).toBeVisible();
  await expect(page).toHaveScreenshot('admin-dashboard.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

function envelope(data: unknown) {
  return JSON.stringify({
    success: true,
    data,
    statusCode: 200,
    timestamp: new Date(0).toISOString(),
  });
}

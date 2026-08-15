import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000004400';
const donationId = '00000000-0000-4000-8000-000000004401';
const now = '2026-08-12T09:00:00.000Z';

test('finance viewers review simulated donation records, receipts and filtered CSV exports', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'FINANCE_VIEWER');
  let listUrl = '';
  await page.route('**/api/v1/system/version', (route) => respond(route, runtime()));
  await page.route('**/api/v1/admin/donations/stats', (route) =>
    respond(route, { totalDonations: 1, totals: [{ currency: 'USD', amount: '25.00' }] }),
  );
  await page.route('**/api/v1/admin/donations?**', (route) => {
    listUrl = route.request().url();
    return respond(route, paged([donation()]));
  });
  await page.route(`**/api/v1/admin/donations/${donationId}`, (route) =>
    respond(route, donation()),
  );
  await page.route(`**/api/v1/admin/donations/${donationId}/receipt`, (route) =>
    respond(route, { receiptUrl: 'http://127.0.0.1:4010/receipts/test.pdf' }),
  );
  await page.route(`**/api/v1/admin/donations/${donationId}/resend-receipt`, (route) =>
    respond(route, { status: 'queued' }, 201),
  );
  await page.route('**/api/v1/admin/donations/export?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: { 'content-disposition': 'attachment; filename="donations.csv"' },
      body: 'id,amount,status\nrecord,25.00,CONFIRMED',
    }),
  );

  await page.goto('/admin/donations');
  await expect(
    page.getByRole('heading', { name: 'Trial finance data — no real money collected' }),
  ).toBeVisible();
  await expect(page.getByText('Simulated confirmations')).toBeVisible();
  await expect(page.getByText('These amounts are demonstration records.')).toBeVisible();
  await page.getByLabel('Donation status').selectOption('CONFIRMED');
  await expect.poll(() => listUrl).toContain('status=CONFIRMED');
  await page.getByRole('button', { name: 'View details' }).click();
  await expect(page.getByRole('heading', { name: 'Donation detail' })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare receipt' }).click();
  await expect(page.getByRole('link', { name: /Open receipt PDF/ })).toHaveAttribute(
    'href',
    'http://127.0.0.1:4010/receipts/test.pdf',
  );
  await page.getByRole('button', { name: 'Resend receipt' }).click();
  await page.getByRole('button', { name: 'Queue receipt' }).click();
  await expect(page.getByText('Test receipt queued')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('donations.csv');
});

test('content editors cannot access financial records', async ({ context, page }) => {
  await authenticate(context, page, 'CONTENT_EDITOR');
  await page.goto('/admin/donations');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('link', { name: 'Donations' })).toHaveCount(0);
});

test('analytics provides non-color chart labels and visible data tables', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'SUPER_ADMIN');
  let timelineUrl = '';
  await page.route('**/api/v1/admin/analytics/summary', (route) =>
    respond(route, {
      totalVisitors: 18,
      topCountries: [
        { country: 'ET', visits: 12 },
        { country: 'KE', visits: 6 },
      ],
      topPages: [
        { route: '/', visits: 11 },
        { route: '/about', visits: 7 },
      ],
    }),
  );
  await page.route('**/api/v1/admin/analytics/timeline?**', (route) => {
    timelineUrl = route.request().url();
    return respond(route, [
      { date: '2026-08-11', visitors: 8 },
      { date: '2026-08-12', visitors: 10 },
    ]);
  });
  await page.goto('/admin/analytics');
  await expect(page.getByText('Recorded page-view events')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top pages data table' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top countries data table' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Thirty-day timeline data table' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '/about' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '7', exact: true })).toBeVisible();
  await page.getByLabel('Timeline range').selectOption('week');
  await expect.poll(() => timelineUrl).toContain('range=week');
  await expect(page.getByRole('table', { name: 'Seven-day timeline data table' })).toBeVisible();
});

test('finance viewers cannot access analytics', async ({ context, page }) => {
  await authenticate(context, page, 'FINANCE_VIEWER');
  await page.goto('/admin/analytics');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('link', { name: 'Analytics' })).toHaveCount(0);
});

async function authenticate(
  context: BrowserContext,
  page: Page,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR' | 'FINANCE_VIEWER',
) {
  const admin = { id: adminId, email: 'admin@example.org', name: 'Administrator', role };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: `step-44-${role}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'step-44-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}
function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, statusCode: status, timestamp: now }),
  });
}
function paged(data: unknown[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 },
  };
}
function runtime() {
  return {
    name: 'NAC API',
    version: '0.1.0',
    environment: 'test',
    mode: 'trial',
    adapters: { storage: 'minio', mail: 'mailpit', payment: 'fake', cache: 'redis' },
    realPaymentsEnabled: false,
  };
}
function donation() {
  return {
    id: donationId,
    donorName: 'Trial Donor',
    donorEmail: 'donor@example.org',
    message: 'A simulated gift.',
    amount: '25.00',
    currency: 'USD',
    gateway: 'SIMULATED',
    status: 'CONFIRMED',
    providerOrderId: `FAKE-${donationId}`,
    externalTransactionId: `FAKE-RECEIPT-${donationId}`,
    receiptUrl: 'http://127.0.0.1:4010/receipts/test.pdf',
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

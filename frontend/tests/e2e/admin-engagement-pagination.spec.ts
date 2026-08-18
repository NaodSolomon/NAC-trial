import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

const adminId = '00000000-0000-4000-8000-000000002101';

function subscriber(index: number) {
  return {
    id: `00000000-0000-4000-8000-00000000210${index}`,
    email: `subscriber${index}@example.org`,
    languageCode: 'en',
    createdAt: '2026-08-01T10:00:00.000Z',
  };
}

async function signIn(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'root@example.org',
    name: 'Root Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'engagement-pagination',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'engagement-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

test('removing a subscriber re-reads the list instead of only editing it locally', async ({
  context,
  page,
}) => {
  await signIn(context, page);
  let remaining = [subscriber(1), subscriber(2)];
  let listRequests = 0;

  await page.route('**/api/v1/admin/newsletter?**', (route) => {
    listRequests += 1;
    return respond(route, {
      data: remaining,
      meta: { total: remaining.length, page: 1, limit: 10, totalPages: 1 },
    });
  });
  await page.route(/\/api\/v1\/admin\/newsletter\/[^?]+$/, (route) => {
    remaining = remaining.slice(1);
    return respond(route, { message: 'Newsletter subscriber deleted successfully' });
  });

  await page.goto('/admin/newsletter');
  await waitForHydration(page);
  await expect(page.getByText('subscriber1@example.org')).toBeVisible();
  const beforeDelete = listRequests;

  await page.getByRole('button', { name: 'Remove' }).first().click();
  await page.getByRole('button', { name: 'Remove subscriber' }).click();

  // Filtering the row out of local state hides the record but leaves the paging
  // metadata describing a list that no longer exists, so the server must be re-read.
  await expect.poll(() => listRequests).toBeGreaterThan(beforeDelete);
  await expect(page.getByText('subscriber1@example.org')).toHaveCount(0);
  await expect(page.getByText('subscriber2@example.org')).toBeVisible();
});

function respond(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: 200,
      timestamp: new Date(0).toISOString(),
    }),
  });
}

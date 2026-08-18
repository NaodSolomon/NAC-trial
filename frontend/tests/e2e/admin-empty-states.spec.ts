import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

const adminId = '00000000-0000-4000-8000-000000001901';

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
      value: 'empty-state-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'empty-state-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

function emptyPage() {
  return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
}

test('an untouched list says nothing exists yet rather than blaming filters', async ({
  context,
  page,
}) => {
  await signIn(context, page);
  await page.route(/\/api\/v1\/admin\/resources(\?|$)/, (route) => respond(route, emptyPage()));

  await page.goto('/admin/resources');
  await waitForHydration(page);

  const state = page.getByRole('status').filter({ hasText: /resources/ });
  await expect(state).toContainText('There are no resources yet.');
  await expect(state).not.toContainText('filters');
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
});

test('a filtered-out list says so and offers a way back', async ({ context, page }) => {
  await signIn(context, page);
  let requested = '';
  await page.route(/\/api\/v1\/admin\/resources(\?|$)/, (route) => {
    requested = route.request().url();
    return respond(route, emptyPage());
  });

  await page.goto('/admin/resources');
  await waitForHydration(page);
  await page.getByLabel('Resource language').selectOption('am');

  const state = page.getByRole('status').filter({ hasText: /resources/ });
  await expect(state).toContainText('No resources match the current filters.');
  await expect.poll(() => requested).toContain('languageCode=am');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(state).toContainText('There are no resources yet.');
  await expect.poll(() => requested).not.toContain('languageCode=am');
});

test('a failed load does not also claim the list is empty', async ({ context, page }) => {
  await signIn(context, page);
  await page.route(/\/api\/v1\/admin\/resources(\?|$)/, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 503,
        message: 'The resource service is unavailable.',
      }),
    }),
  );

  await page.goto('/admin/resources');
  await waitForHydration(page);

  // Next.js renders an empty role=alert route announcer, so target the message.
  await expect(
    page.getByRole('alert').filter({ hasText: 'The resource service is unavailable.' }),
  ).toBeVisible();
  // Emptiness is unknown when the request failed, so claiming it would be wrong.
  await expect(page.getByText(/No resources/)).toHaveCount(0);
});

test('the empty state is announced rather than shown silently', async ({ context, page }) => {
  await signIn(context, page);
  await page.route(/\/api\/v1\/admin\/users(\?|$)/, (route) => respond(route, emptyPage()));

  await page.goto('/admin/users');
  await waitForHydration(page);

  await expect(page.getByRole('status').filter({ hasText: /accounts/ })).toBeVisible();
});

test('an engagement list distinguishes the same two cases', async ({ context, page }) => {
  await signIn(context, page);
  await page.route(/\/api\/v1\/admin\/contact(\?|$)/, (route) => respond(route, emptyPage()));

  await page.goto('/admin/contact');
  await waitForHydration(page);

  const state = page.getByRole('status').filter({ hasText: /contact submissions/ });
  await expect(state).toContainText('There are no contact submissions yet.');

  await page.getByLabel('Filter by language').selectOption('en');
  await expect(state).toContainText('No contact submissions match the current filters.');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(state).toContainText('There are no contact submissions yet.');
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

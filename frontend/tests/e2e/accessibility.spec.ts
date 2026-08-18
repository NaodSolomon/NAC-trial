import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';
import { adminWorkspaceScreens, mockAdminWorkspace } from '../helpers/admin-workspace';

const localizedRoutes = [
  '/',
  '/about',
  '/faq',
  '/blog',
  '/blog/how-your-donations-change-lives',
  '/events',
  '/events/family-support-day',
  '/resources',
  '/search?q=support',
  '/gallery',
  '/contact',
  '/volunteer',
  '/donate',
] as const;

const routes = [
  ...localizedRoutes.flatMap((route) =>
    (['en', 'am'] as const).map((language) => appendLanguage(route, language)),
  ),
  '/coming-soon',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password?token=invalid-test-token',
] as const;

for (const route of routes) {
  test(`${route} has no moderate-or-worse Axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    await expectNoBlockingViolations(page);
  });
}

// The authenticated workspace was previously unchecked: the suite could only reach
// the sign-in pages. These reuse the visual suite's mocked workspace so each screen
// renders with real content rather than an empty shell that would hide violations.
test.describe('authenticated administrator workspace', () => {
  test.beforeEach(async ({ context, page }) => {
    await mockAdminWorkspace(context, page);
  });

  test('admin-dashboard has no moderate-or-worse Axe violations', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Page views')).toBeVisible();
    await expectNoBlockingViolations(page);
  });

  for (const screen of adminWorkspaceScreens) {
    test(`${screen.name} has no moderate-or-worse Axe violations`, async ({ page }) => {
      await page.goto(screen.path);
      await expect(page.getByRole('heading', { name: screen.ready })).toBeVisible();
      await settle(page);
      await expectNoBlockingViolations(page);
    });
  }
});

// Loading a form proves nothing about the state an editor actually meets when
// something goes wrong. These cases drive each administrator form into its error
// or confirmation state and check that state instead.
const states = [
  {
    name: 'sign in showing field and credential errors',
    async arrange(page: Page) {
      await page.route('**/api/auth/login', (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, statusCode: 401, message: 'Invalid credentials' }),
        }),
      );
      await page.goto('/admin/login');
      await waitForHydration(page);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.getByRole('alert').first().waitFor();
    },
  },
  {
    name: 'password reset request showing its confirmation',
    async arrange(page: Page) {
      await page.route('**/api/v1/auth/password-reset/request', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: null, statusCode: 200 }),
        }),
      );
      await page.goto('/admin/forgot-password');
      await waitForHydration(page);
      await page.getByLabel('Administrator email').fill('admin@example.org');
      await page.getByRole('button', { name: 'Send reset instructions' }).click();
      await page.getByRole('status').waitFor();
    },
  },
  {
    name: 'new password showing policy and mismatch errors',
    async arrange(page: Page) {
      await page.goto(`/admin/reset-password?token=${'a'.repeat(64)}`);
      await waitForHydration(page);
      await page.getByLabel('New password', { exact: true }).fill('short');
      await page.getByLabel('Confirm new password').fill('different');
      await page.getByRole('button', { name: 'Reset password' }).click();
      await page.getByRole('alert').first().waitFor();
    },
  },
] as const;

for (const state of states) {
  test(`${state.name} has no moderate-or-worse Axe violations`, async ({ page }) => {
    await state.arrange(page);
    await expectNoBlockingViolations(page);
  });
}

// Screens disable their controls while data loads, and a disabled control rendered at
// half opacity fails a contrast check that WCAG 1.4.3 does not actually apply to
// inactive components. Waiting for the load to finish checks the state that matters
// rather than suppressing a rule.
async function settle(page: Page) {
  await expect(page.getByText(/^Loading/i)).toHaveCount(0);
}

async function expectNoBlockingViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter((violation) =>
    ['moderate', 'serious', 'critical'].includes(violation.impact ?? ''),
  );
  const summary = blocking.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' > ')),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

function appendLanguage(route: string, language: 'en' | 'am') {
  return `${route}${route.includes('?') ? '&' : '?'}lang=${language}`;
}

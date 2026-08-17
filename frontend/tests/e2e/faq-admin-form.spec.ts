import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000000960';
const faq = {
  id: '00000000-0000-4000-8000-000000000961',
  languageCode: 'en',
  translationKey: 'what-does-the-center-do',
  category: 'Services',
  question: 'What does the center do?',
  answer: 'We support autistic children and their families.',
  status: 'DRAFT',
  sortOrder: 0,
};

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: status,
      timestamp: '2026-08-16T00:00:00.000Z',
    }),
  });
}

async function openFaqAdmin(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'editor@example.org',
    name: 'Content Editor',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'faq-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'faq-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  const observed: { posted: boolean } = { posted: false };
  await page.route(/\/api\/v1\/admin\/faqs(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      observed.posted = true;
      return respond(route, faq, 201);
    }
    return respond(route, {
      data: [faq],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
  });

  await page.goto('/admin/faq');
  await expect(page.getByRole('heading', { name: 'FAQ administration' })).toBeVisible();
  return observed;
}

test('reports a validation problem beside the field it belongs to', async ({ context, page }) => {
  const observed = await openFaqAdmin(context, page);
  await page.getByRole('button', { name: 'New question' }).click();

  await page.getByLabel('Translation key').fill('Not A Valid Key');
  await page.getByLabel('Question', { exact: true }).fill('A valid question?');
  await page.getByLabel('Answer', { exact: true }).fill('A valid answer.');
  await page.getByRole('button', { name: 'Save' }).click();

  const translationKey = page.getByLabel('Translation key');
  await expect(translationKey).toHaveAttribute('aria-invalid', 'true');
  await expect(translationKey).toHaveAttribute('aria-describedby', 'translationKey-error');
  await expect(page.locator('#translationKey-error')).toContainText(/lowercase letters/i);

  await expect(page.getByLabel('Question', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'false',
  );
  expect(observed.posted).toBe(false);
});

test('moves focus to the first invalid field on submission', async ({ context, page }) => {
  await openFaqAdmin(context, page);
  await page.getByRole('button', { name: 'New question' }).click();

  await page.getByLabel('Question', { exact: true }).fill('A valid question?');
  await page.getByLabel('Answer', { exact: true }).fill('A valid answer.');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByLabel('Translation key')).toBeFocused();
});

test('focuses the answer when only the answer is missing', async ({ context, page }) => {
  await openFaqAdmin(context, page);
  await page.getByRole('button', { name: 'New question' }).click();

  await page.getByLabel('Translation key').fill('valid-translation-key');
  await page.getByLabel('Question', { exact: true }).fill('A valid question?');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByLabel('Answer', { exact: true })).toBeFocused();
});

test('clears field errors once the value becomes valid', async ({ context, page }) => {
  const observed = await openFaqAdmin(context, page);
  await page.getByRole('button', { name: 'New question' }).click();

  await page.getByLabel('Question', { exact: true }).fill('A valid question?');
  await page.getByLabel('Answer', { exact: true }).fill('A valid answer.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#translationKey-error')).toBeVisible();

  await page.getByLabel('Translation key').fill('valid-translation-key');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('#translationKey-error')).toHaveCount(0);
  await expect.poll(() => observed.posted).toBe(true);
});

import { expect, test, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000000950';
const faq = {
  id: '00000000-0000-4000-8000-000000000951',
  languageCode: 'en',
  translationKey: 'what-does-the-center-do',
  category: 'Services',
  question: 'What does the center do?',
  answer: 'We support autistic children and their families.',
  status: 'DRAFT',
  sortOrder: 0,
};
const second = { ...faq, id: '00000000-0000-4000-8000-000000000952', question: 'Second question', sortOrder: 1 };

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

async function authenticate(context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page) {
  const admin = {
    id: adminId,
    email: 'editor@example.org',
    name: 'Content Editor',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'faq-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'faq-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

test('lists FAQ entries, creates one, and reorders without leaving the page', async ({
  context,
  page,
}) => {
  await authenticate(context, page);

  const observed: { created?: Record<string, unknown>; reordered?: Record<string, unknown> } = {};

  await page.route(/\/api\/v1\/admin\/faqs\/reorder$/, async (route) => {
    observed.reordered = route.request().postDataJSON() as Record<string, unknown>;
    return respond(route, { reordered: 2 }, 201);
  });

  await page.route(/\/api\/v1\/admin\/faqs(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, { ...faq, question: String(observed.created.question) }, 201);
    }
    return respond(route, {
      data: [faq, second],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
    });
  });

  await page.goto('/admin/faq');
  await expect(page.getByRole('heading', { name: 'FAQ administration' })).toBeVisible();

  await expect(page.getByText('What does the center do?')).toBeVisible();
  await expect(page.getByText('Second question')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /went wrong|error/i })).toHaveCount(0);

  await expect(page.getByRole('button', { name: 'Move "What does the center do?" up' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move "Second question" down' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move "Second question" up' })).toBeEnabled();

  await page.getByRole('button', { name: 'Move "Second question" up' }).click();
  await expect.poll(() => observed.reordered?.entries).toEqual([
    { id: '00000000-0000-4000-8000-000000000952', sortOrder: 0 },
    { id: faq.id, sortOrder: 1 },
  ]);

  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByLabel('Translation key').fill('is-there-parking');
  await page.getByLabel('Question', { exact: true }).fill('Is there parking?');
  await page.getByLabel('Answer', { exact: true }).fill('Yes, on site.');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => observed.created?.translationKey).toBe('is-there-parking');
  expect(observed.created).toMatchObject({ languageCode: 'en', question: 'Is there parking?' });
});

test('reports validation problems before contacting the API', async ({ context, page }) => {
  await authenticate(context, page);

  let posted = false;
  await page.route(/\/api\/v1\/admin\/faqs(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      posted = true;
      return respond(route, faq, 201);
    }
    return respond(route, { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });
  });

  await page.goto('/admin/faq');
  await page.getByRole('button', { name: 'New question' }).click();
  await page.getByLabel('Translation key').fill('Not A Valid Key');
  await page.getByLabel('Question', { exact: true }).fill('Anything');
  await page.getByLabel('Answer', { exact: true }).fill('Anything');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert').filter({ hasText: /lowercase letters/i })).toBeVisible();
  expect(posted).toBe(false);
});

test('hides the delete control from a content editor', async ({ context, page }) => {
  const admin = {
    id: adminId,
    email: 'editor@example.org',
    name: 'Content Editor',
    role: 'CONTENT_EDITOR',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'faq-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'faq-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
  await page.route(/\/api\/v1\/admin\/faqs(\?|$)/, (route) =>
    respond(route, { data: [faq], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } }),
  );

  await page.goto('/admin/faq');
  await page.getByText('What does the center do?').click();
  await expect(page.getByRole('heading', { name: 'Edit question' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

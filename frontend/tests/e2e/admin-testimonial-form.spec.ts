import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001901';
const testimonialId = '00000000-0000-4000-8000-000000001902';

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

function testimonial(overrides: Record<string, unknown> = {}) {
  return {
    id: testimonialId,
    translationKey: '00000000-0000-4000-8000-000000001903',
    name: 'A grateful parent',
    text: 'The centre gave our family practical guidance and a community.',
    languageCode: 'en',
    status: 'PUBLISHED',
    createdBy: adminId,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

async function openTestimonialAdmin(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'admin@example.org',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'testimonial-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'testimonial-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  const observed: {
    created?: Record<string, unknown>;
    updated?: Record<string, unknown>;
    listUrl?: string;
  } = {};

  await page.route(/\/api\/v1\/admin\/testimonials\/[0-9a-f-]+$/, async (route) => {
    if (route.request().method() === 'PATCH') {
      observed.updated = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, testimonial(observed.updated));
    }
    return respond(route, { message: 'Testimonial deleted successfully' });
  });

  await page.route(/\/api\/v1\/admin\/testimonials(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, testimonial(observed.created), 201);
    }
    observed.listUrl = route.request().url();
    return respond(route, {
      data: [testimonial()],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  await page.goto('/admin/testimonials');
  await expect(page.getByRole('heading', { name: 'New testimonial' })).toBeVisible();
  return observed;
}

test('reports the schema wording beside the field it belongs to', async ({ context, page }) => {
  const observed = await openTestimonialAdmin(context, page);

  await page.getByLabel('Name').fill('A');
  await page.getByLabel('Testimonial', { exact: true }).fill('Too short');
  await page.getByRole('button', { name: 'Save testimonial' }).click();

  const name = page.getByLabel('Name');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAttribute('aria-describedby', 'name-error');
  await expect(page.locator('#name-error')).toContainText(
    'Name must contain at least 2 characters.',
  );

  await expect(page.locator('#text-error')).toContainText(
    'Testimonial must contain at least 10 characters.',
  );
  await expect(page.locator('#languageCode')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.created).toBeUndefined();
});

test('moves focus to the first invalid field on submit', async ({ context, page }) => {
  await openTestimonialAdmin(context, page);

  await page.getByRole('button', { name: 'Save testimonial' }).click();

  await expect(page.getByLabel('Name')).toBeFocused();
});

test('focuses the testimonial body when only that field is invalid', async ({ context, page }) => {
  await openTestimonialAdmin(context, page);

  await page.getByLabel('Name').fill('A grateful parent');
  await page.getByRole('button', { name: 'Save testimonial' }).click();

  await expect(page.getByLabel('Testimonial', { exact: true })).toBeFocused();
});

test('submits a new testimonial with its chosen visibility', async ({ context, page }) => {
  const observed = await openTestimonialAdmin(context, page);

  await page.getByLabel('Name').fill('A grateful parent');
  await page
    .getByLabel('Testimonial', { exact: true })
    .fill('The centre gave our family practical guidance and a community.');
  await page.getByLabel('Visibility').selectOption('PUBLISHED');
  await page.getByRole('button', { name: 'Save testimonial' }).click();

  await expect.poll(() => observed.created?.name).toBe('A grateful parent');
  expect(observed.created).toMatchObject({
    text: 'The centre gave our family practical guidance and a community.',
    status: 'PUBLISHED',
    languageCode: 'en',
  });
});

test('submits on Enter now that the editor is a real form', async ({ context, page }) => {
  const observed = await openTestimonialAdmin(context, page);

  await page.getByLabel('Name').fill('A grateful parent');
  await page
    .getByLabel('Testimonial', { exact: true })
    .fill('The centre gave our family practical guidance and a community.');
  await page.getByLabel('Name').press('Enter');

  await expect.poll(() => observed.created?.name).toBe('A grateful parent');
});

test('loads a selected testimonial and keeps its language fixed', async ({ context, page }) => {
  await openTestimonialAdmin(context, page);

  await page.getByRole('button', { name: /A grateful parent/ }).click();

  await expect(page.getByRole('heading', { name: 'Edit testimonial' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('A grateful parent');
  await expect(page.getByLabel('Visibility')).toHaveValue('PUBLISHED');
  await expect(page.locator('#languageCode')).toBeDisabled();
});

test('clears a field error once the value becomes valid', async ({ context, page }) => {
  const observed = await openTestimonialAdmin(context, page);

  await page.getByRole('button', { name: 'Save testimonial' }).click();
  await expect(page.locator('#name-error')).toBeVisible();

  await page.getByLabel('Name').fill('A grateful parent');
  await page
    .getByLabel('Testimonial', { exact: true })
    .fill('The centre gave our family practical guidance and a community.');
  await page.getByRole('button', { name: 'Save testimonial' }).click();

  await expect(page.locator('#name-error')).toHaveCount(0);
  await expect.poll(() => observed.created?.name).toBe('A grateful parent');
});

test('leaves the language unfiltered when every language is selected', async ({
  context,
  page,
}) => {
  const observed = await openTestimonialAdmin(context, page);

  await expect.poll(() => observed.listUrl).toBeTruthy();
  expect(observed.listUrl).not.toContain('languageCode');

  await page.getByLabel('Filter by language').selectOption('am');
  await expect.poll(() => observed.listUrl).toContain('languageCode=am');

  await page.getByLabel('Filter by language').selectOption('');
  await expect.poll(() => observed.listUrl).not.toContain('languageCode');
});

test('marks the selected record for assistive technology, not by colour alone', async ({
  context,
  page,
}) => {
  await openTestimonialAdmin(context, page);
  const entry = page.getByRole('button', { name: /A grateful parent/ });

  await expect(entry).not.toHaveAttribute('aria-current', 'true');
  await entry.click();
  await expect(entry).toHaveAttribute('aria-current', 'true');
});

test('reports why a deletion failed instead of a generic message', async ({ context, page }) => {
  await openTestimonialAdmin(context, page);

  await page.route(/\/api\/v1\/admin\/testimonials\/[0-9a-f-]+$/, (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 403,
        message: 'Only a super administrator may delete testimonials.',
      }),
    }),
  );

  await page.getByRole('button', { name: /A grateful parent/ }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete testimonial' }).click();

  await expect(page.getByRole('dialog')).toContainText(/super administrator may delete/i);
  await expect(page.getByRole('dialog')).toContainText(/No changes were applied/i);
});

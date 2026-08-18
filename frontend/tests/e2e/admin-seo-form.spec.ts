import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001701';
const pageId = '00000000-0000-4000-8000-000000001702';

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

function cmsPage(overrides: Record<string, unknown> = {}) {
  return {
    id: pageId,
    slug: 'about',
    languageCode: 'en',
    title: 'About the center',
    content: 'Body copy.',
    metadata: {},
    status: 'PUBLISHED',
    seoTitle: 'Autism support in Ethiopia',
    seoDescription: 'Family-centered autism support and community programmes.',
    seoKeywords: ['autism', 'ethiopia'],
    seoImageUrl: 'https://media.example.org/seo.jpg',
    translationKey: '00000000-0000-4000-8000-000000001703',
    scheduledAt: null,
    publishedAt: '2026-08-01T10:00:00.000Z',
    createdBy: adminId,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

async function openSeoAdmin(context: BrowserContext, page: Page) {
  const admin = {
    id: adminId,
    email: 'admin@example.org',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'seo-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'seo-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  const observed: { submitted?: Record<string, unknown> } = {};
  await page.route('**/api/v1/admin/seo/**', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    observed.submitted = body;
    return respond(route, {
      slug: 'about',
      languageCode: body.languageCode,
      title: String(body.title ?? ''),
      description: body.description ?? null,
      keywords: [],
      imageUrl: body.imageUrl || null,
    });
  });
  await page.route('**/api/v1/admin/cms/pages**', (route) =>
    respond(route, {
      data: [cmsPage()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    }),
  );

  await page.goto('/admin/seo');
  await expect(page.getByRole('heading', { name: 'SEO metadata' })).toBeVisible();
  await expect(page.getByLabel('SEO title')).toHaveValue('Autism support in Ethiopia');
  return observed;
}

test('loads the selected page metadata into every field', async ({ context, page }) => {
  await openSeoAdmin(context, page);

  await expect(page.getByLabel('SEO description')).toHaveValue(
    'Family-centered autism support and community programmes.',
  );
  await expect(page.getByLabel(/Keywords/)).toHaveValue('autism, ethiopia');
  await expect(page.getByLabel('Social image URL')).toHaveValue(
    'https://media.example.org/seo.jpg',
  );
});

test('shows a live character count against each backend limit', async ({ context, page }) => {
  await openSeoAdmin(context, page);

  await expect(page.getByText('26/70')).toBeVisible();

  await page.getByLabel('SEO title').fill('Short');
  await expect(page.getByText('5/70')).toBeVisible();

  await page.getByLabel('SEO description').fill('A description.');
  await expect(page.getByText('14/160')).toBeVisible();
});

test('keeps the search preview in step with the fields', async ({ context, page }) => {
  await openSeoAdmin(context, page);
  const preview = page.getByRole('complementary', { name: 'Search result preview' });

  await page.getByLabel('SEO title').fill('A freshly typed title');
  await expect(preview).toContainText('A freshly typed title');

  await page.getByLabel('SEO description').fill('A freshly typed description.');
  await expect(preview).toContainText('A freshly typed description.');
});

test('reports too many keywords against the keywords field', async ({ context, page }) => {
  const observed = await openSeoAdmin(context, page);

  await page
    .getByLabel(/Keywords/)
    .fill('one, two, three, four, five, six, seven, eight, nine, ten, eleven');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();

  await expect(page.locator('#keywordsText-error')).toContainText(/no more than 10 keywords/i);
  await expect(page.getByLabel(/Keywords/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('SEO title')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.submitted).toBeUndefined();
});

test('reports an over-long keyword against the keywords field', async ({ context, page }) => {
  const observed = await openSeoAdmin(context, page);

  await page.getByLabel(/Keywords/).fill('a'.repeat(41));
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();

  await expect(page.locator('#keywordsText-error')).toContainText(/40 characters or fewer/i);
  expect(observed.submitted).toBeUndefined();
});

test('reports an unapproved social image URL against the image field', async ({
  context,
  page,
}) => {
  const observed = await openSeoAdmin(context, page);

  await page.getByLabel('Social image URL').fill('http://attacker.example/banner.png');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();

  const image = page.getByLabel('Social image URL');
  await expect(image).toHaveAttribute('aria-invalid', 'true');
  // The field is described by its error and by its character counter, so this
  // asserts the error is referenced rather than that it is the only description.
  await expect(image).toHaveAttribute('aria-describedby', /(^| )imageUrl-error( |$)/);
  await expect(page.locator('#imageUrl-error')).toContainText(/HTTPS/i);
  await expect(page.getByLabel(/Keywords/)).toHaveAttribute('aria-invalid', 'false');
  expect(observed.submitted).toBeUndefined();
});

test('caps the length-limited fields so they cannot exceed the backend limit', async ({
  context,
  page,
}) => {
  await openSeoAdmin(context, page);

  await page.getByLabel('SEO title').fill('t'.repeat(90));
  await expect(page.getByLabel('SEO title')).toHaveValue('t'.repeat(70));

  await page.getByLabel('SEO description').fill('d'.repeat(200));
  await expect(page.getByLabel('SEO description')).toHaveValue('d'.repeat(160));
});

test('moves focus to the first invalid field on submit', async ({ context, page }) => {
  await openSeoAdmin(context, page);

  await page
    .getByLabel(/Keywords/)
    .fill('one, two, three, four, five, six, seven, eight, nine, ten, eleven');
  await page.getByLabel('Social image URL').fill('http://attacker.example/banner.png');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();

  await expect(page.getByLabel(/Keywords/)).toBeFocused();
});

test('submits valid metadata and clears the error once corrected', async ({ context, page }) => {
  const observed = await openSeoAdmin(context, page);

  await page.getByLabel('Social image URL').fill('http://attacker.example/banner.png');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();
  await expect(page.locator('#imageUrl-error')).toBeVisible();

  await page.getByLabel('Social image URL').fill('https://media.example.org/updated.jpg');
  await page.getByLabel('SEO title').fill('Updated search title');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();

  await expect(page.locator('#imageUrl-error')).toHaveCount(0);
  await expect(page.getByText('SEO metadata saved')).toBeVisible();
  expect(observed.submitted).toMatchObject({
    title: 'Updated search title',
    imageUrl: 'https://media.example.org/updated.jpg',
  });
});

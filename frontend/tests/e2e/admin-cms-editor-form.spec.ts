import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';

const adminId = '00000000-0000-4000-8000-000000001701';
const pageId = '00000000-0000-4000-8000-000000001702';
const translationKey = '00000000-0000-4000-8000-000000001703';
const now = '2026-08-01T10:00:00.000Z';

function cmsPage(overrides: Record<string, unknown> = {}) {
  return {
    id: pageId,
    translationKey,
    slug: 'family-support',
    languageCode: 'en',
    title: 'Family support',
    content: 'Existing published content.',
    status: 'DRAFT',
    metadata: {},
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    seoKeywords: [],
    createdBy: adminId,
    scheduledAt: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type Observed = { created?: Record<string, unknown>; updated?: Record<string, unknown> };

async function openEditor(
  context: BrowserContext,
  page: Page,
  options: { existing?: Record<string, unknown>; slugAvailable?: boolean } = {},
) {
  const admin = {
    id: adminId,
    email: 'root@example.org',
    name: 'Root Administrator',
    role: 'SUPER_ADMIN',
  };
  const observed: Observed = {};

  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'cms-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'cms-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));

  await page.route(/\/api\/v1\/admin\/slugs\/check/, (route) => {
    const url = new URL(route.request().url());
    return respond(route, {
      slug: url.searchParams.get('slug') ?? '',
      languageCode: url.searchParams.get('languageCode') ?? 'en',
      available: options.slugAvailable ?? true,
    });
  });

  await page.route(/\/api\/v1\/admin\/cms\/pages(\?|$)/, (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, cmsPage(observed.created), 201);
    }
    return respond(route, { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  await page.route(/\/api\/v1\/admin\/cms\/pages\/[0-9a-f-]+$/, (route) => {
    if (route.request().method() === 'GET') return respond(route, cmsPage(options.existing));
    observed.updated = route.request().postDataJSON() as Record<string, unknown>;
    return respond(route, cmsPage({ ...options.existing, ...observed.updated }));
  });

  await page.goto(options.existing ? `/admin/content/${pageId}` : '/admin/content/new');
  await waitForHydration(page);
  await expect(page.getByRole('form', { name: 'CMS page details' })).toBeVisible();
  return observed;
}

test('an empty draft reports each required field beside that field', async ({ context, page }) => {
  const observed = await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await form.getByRole('button', { name: 'Create draft' }).click();

  await expect(form.getByText('A title is required.')).toBeVisible();
  await expect(form.getByText('The slug must contain at least 2 characters.')).toBeVisible();
  await expect(form.getByText('Page content is required.')).toBeVisible();
  await expect(page.locator('#cms-title')).toBeFocused();
  await expect(page.locator('#cms-content')).toHaveAttribute(
    'aria-describedby',
    /cms-content-error/,
  );
  expect(observed.created).toBeUndefined();
});

test('the slug rule is explained rather than shown as a regular expression', async ({
  context,
  page,
}) => {
  await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await page.locator('#cms-slug').fill('Family Support');
  await form.getByRole('button', { name: 'Create draft' }).click();

  await expect(
    form.getByText(
      'Use lowercase letters, numbers and single hyphens, for example family-support.',
    ),
  ).toBeVisible();
});

test('an invalid translation key explains itself instead of reporting invalid input', async ({
  context,
  page,
}) => {
  await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await page.locator('#cms-translation-key').fill('not-a-uuid');
  await form.getByRole('button', { name: 'Create draft' }).click();

  await expect(
    form.getByText('Enter a valid UUID, or leave this blank to generate one.'),
  ).toBeVisible();
});

test('homepage rules are reported on the structured fields that failed', async ({
  context,
  page,
}) => {
  const observed = await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await page.locator('#cms-title').fill('Homepage');
  await page.locator('#cms-slug').fill('home');
  await page.locator('#cms-content').fill('Homepage body content.');
  await page.locator('#cms-content-type').selectOption('homepage');
  await page.locator('#homepage-mapEmbedUrl').fill('http://maps.example.com/embed');
  await form.getByRole('button', { name: 'Create draft' }).click();

  // Each of these used to arrive as an unattached bullet at the top of the page.
  await expect(page.locator('#homepage-heroHeading-error')).toHaveText('Hero heading is required.');
  await expect(page.locator('#homepage-mapEmbedUrl-error')).toHaveText(
    'Use an approved HTTPS Google Maps embed URL.',
  );
  await expect(page.locator('#homepage-mapEmbedUrl')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Add at least one service.')).toBeVisible();
  expect(observed.created).toBeUndefined();
});

test('the character counter is a description, not part of the field name', async ({
  context,
  page,
}) => {
  await openEditor(context, page);
  const content = page.locator('#cms-content');

  await content.fill('Twelve chars');
  // A counter inside the label would make the accessible name change on every keystroke.
  await expect(content).toHaveAccessibleName('Page content');
  await expect(page.locator('#cms-content-counter')).toHaveText('12/200000');
  await expect(content).toHaveAttribute('aria-describedby', /cms-content-counter/);
});

test('slug availability is discarded when the slug or language changes', async ({
  context,
  page,
}) => {
  await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await page.locator('#cms-slug').fill('family-support');
  await form.getByRole('button', { name: 'Check availability' }).click();
  await expect(form.getByText('Slug is available.')).toBeVisible();

  // The answer was for one slug in one language and must not outlive either.
  await page.locator('#cms-language').selectOption('am');
  await expect(form.getByText('Slug is available.')).toHaveCount(0);

  await form.getByRole('button', { name: 'Check availability' }).click();
  await expect(form.getByText('Slug is available.')).toBeVisible();
  await page.locator('#cms-slug').fill('family-support-2');
  await expect(form.getByText('Slug is available.')).toHaveCount(0);
});

test('a valid draft is created with the values that were typed', async ({ context, page }) => {
  const observed = await openEditor(context, page);
  const form = page.getByRole('form', { name: 'CMS page details' });

  await page.locator('#cms-title').fill('Family support');
  await page.locator('#cms-slug').fill('family-support');
  await page.locator('#cms-content').fill('Guidance for families.');
  await form.getByRole('button', { name: 'Create draft' }).click();

  await expect(page.getByText('Draft page created')).toBeVisible();
  expect(observed.created).toMatchObject({
    title: 'Family support',
    slug: 'family-support',
    content: 'Guidance for families.',
    languageCode: 'en',
  });
});

test('the language is fixed once a page exists and says so', async ({ context, page }) => {
  await openEditor(context, page, { existing: { title: 'Family support' } });
  const form = page.getByRole('form', { name: 'CMS page details' });

  await expect(page.locator('#cms-language')).toBeDisabled();
  await expect(form.getByText('The language is fixed once a page exists.')).toBeVisible();
  await expect(page.locator('#cms-translation-key')).toHaveCount(0);
});

test('a rejected schedule is reported on the date field and blocks the request', async ({
  context,
  page,
}) => {
  await openEditor(context, page, { existing: { title: 'Family support' } });

  await page.getByRole('button', { name: 'Schedule' }).click();
  await page.getByRole('button', { name: 'Confirm schedule' }).click();

  await expect(page.locator('#cms-scheduled-at-error')).toHaveText(
    'Choose a future local date and time.',
  );
  await expect(page.locator('#cms-scheduled-at')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#cms-scheduled-at').fill('2030-01-02T12:30');
  await expect(page.locator('#cms-scheduled-at-error')).toHaveCount(0);
});

test('a failed save keeps the typed content and reports the reason once', async ({
  context,
  page,
}) => {
  await openEditor(context, page, { existing: { title: 'Family support' } });

  await page.route(/\/api\/v1\/admin\/cms\/pages\/[0-9a-f-]+$/, (route) => {
    if (route.request().method() === 'GET') return respond(route, cmsPage());
    return route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 409,
        message: 'Another page already uses that slug.',
      }),
    });
  });

  await page.locator('#cms-content').fill('Unsaved failure content');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const alert = page.getByRole('alert').filter({ hasText: 'unsaved content remains' });
  await expect(alert).toContainText('Another page already uses that slug.');
  await expect(page.locator('#cms-content')).toHaveValue('Unsaved failure content');
});

test('deleting names the page inside the confirmation dialog', async ({ context, page }) => {
  await openEditor(context, page, { existing: { title: 'Family support' } });

  await page.getByRole('button', { name: 'Delete page' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete this CMS page?');
  await expect(dialog).toContainText('Family support');
});

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data,
      statusCode: status,
      timestamp: new Date(0).toISOString(),
    }),
  });
}

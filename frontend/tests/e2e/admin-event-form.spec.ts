import { expect, test, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001501';
const eventId = '00000000-0000-4000-8000-000000001502';

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

function eventItem(overrides: Record<string, unknown> = {}) {
  return {
    id: eventId,
    translationKey: '00000000-0000-4000-8000-000000001503',
    slug: 'family-day',
    title: 'Family day',
    description: 'An inclusive activity for families and supporters.',
    startDate: '2030-08-12T10:00:00.000Z',
    endDate: '2030-08-12T12:00:00.000Z',
    location: 'Addis Ababa',
    imageUrl: null,
    rsvpEnabled: true,
    status: 'PUBLISHED',
    languageCode: 'en',
    createdBy: adminId,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

test.beforeEach(async ({ context, page }) => {
  const admin = {
    id: adminId,
    email: 'admin@example.org',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
  };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: 'event-form-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'event-form-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
});

async function openEventAdmin(page: Page) {
  const observed: { created?: Record<string, unknown>; updated?: Record<string, unknown> } = {};

  await page.route(/\/api\/v1\/admin\/events\/[0-9a-f-]+$/, async (route) => {
    if (route.request().method() === 'PATCH') {
      observed.updated = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, eventItem(observed.updated));
    }
    return respond(route, eventItem());
  });

  await page.route(/\/api\/v1\/admin\/events(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      observed.created = route.request().postDataJSON() as Record<string, unknown>;
      return respond(route, eventItem(observed.created), 201);
    }
    return respond(route, {
      data: [eventItem()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });
  });

  await page.goto('/admin/events');
  await expect(page.getByRole('heading', { name: 'Event administration' })).toBeVisible();
  return observed;
}

test('reports each invalid field beside itself rather than in one banner', async ({ page }) => {
  const observed = await openEventAdmin(page);
  await page.getByRole('button', { name: 'New event' }).click();

  await page.getByLabel('Slug').fill('Not A Valid Slug');
  await page.getByRole('button', { name: 'Create event' }).click();

  const slug = page.getByLabel('Slug');
  await expect(slug).toHaveAttribute('aria-invalid', 'true');
  await expect(slug).toHaveAttribute('aria-describedby', 'slug-error');
  await expect(page.locator('#slug-error')).toBeVisible();

  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Location')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Description')).toHaveAttribute('aria-invalid', 'true');

  expect(observed.created).toBeUndefined();
});

test('moves focus to the first invalid field on submit', async ({ page }) => {
  await openEventAdmin(page);
  await page.getByRole('button', { name: 'New event' }).click();

  await page.getByRole('button', { name: 'Create event' }).click();

  await expect(page.getByLabel('Slug')).toBeFocused();
});

test('reports an end date before the start date against the end date field', async ({ page }) => {
  const observed = await openEventAdmin(page);
  await page.getByRole('button', { name: 'New event' }).click();

  await page.getByLabel('Slug').fill('valid-event-slug');
  await page.getByLabel('Title').fill('A valid event title');
  await page.getByLabel('Location').fill('Addis Ababa');
  await page.getByLabel('Description').fill('A sufficiently long description.');
  await page.getByLabel('Start date and time').fill('2030-09-01T12:00');
  await page.getByLabel('End date and time').fill('2030-09-01T10:00');

  await page.getByRole('button', { name: 'Create event' }).click();

  const endDate = page.getByLabel('End date and time');
  await expect(endDate).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#endDate-error')).toContainText(/after start date/i);
  await expect(page.getByLabel('Start date and time')).toHaveAttribute('aria-invalid', 'false');
  expect(observed.created).toBeUndefined();
});

test('submits a fully valid new event including the RSVP toggle', async ({ page }) => {
  const observed = await openEventAdmin(page);
  await page.getByRole('button', { name: 'New event' }).click();

  await page.getByLabel('Slug').fill('valid-event-slug');
  await page.getByLabel('Title').fill('A valid event title');
  await page.getByLabel('Location').fill('Addis Ababa');
  await page.getByLabel('Description').fill('A sufficiently long description.');
  await page.getByLabel('Start date and time').fill('2030-09-01T10:00');
  await page.getByLabel('End date and time').fill('2030-09-01T12:00');
  await page.getByLabel('Enable public RSVP').check();
  await page.getByLabel('Publication status').selectOption('PUBLISHED');

  await page.getByRole('button', { name: 'Create event' }).click();

  await expect.poll(() => observed.created?.slug).toBe('valid-event-slug');
  expect(observed.created).toMatchObject({
    title: 'A valid event title',
    location: 'Addis Ababa',
    rsvpEnabled: true,
    status: 'PUBLISHED',
    languageCode: 'en',
  });
});

test('loads a selected event into the editor and keeps its language fixed', async ({ page }) => {
  await openEventAdmin(page);

  await page.getByRole('button', { name: /Family day/ }).click();

  await expect(page.getByLabel('Slug')).toHaveValue('family-day');
  await expect(page.getByLabel('Title')).toHaveValue('Family day');
  await expect(page.getByLabel('Location')).toHaveValue('Addis Ababa');
  await expect(page.getByLabel('Enable public RSVP')).toBeChecked();
  await expect(page.getByLabel('Language', { exact: true })).toBeDisabled();
});

test('clears a field error once the value becomes valid', async ({ page }) => {
  const observed = await openEventAdmin(page);
  await page.getByRole('button', { name: 'New event' }).click();

  await page.getByRole('button', { name: 'Create event' }).click();
  await expect(page.locator('#slug-error')).toBeVisible();

  await page.getByLabel('Slug').fill('valid-event-slug');
  await page.getByLabel('Title').fill('A valid event title');
  await page.getByLabel('Location').fill('Addis Ababa');
  await page.getByLabel('Description').fill('A sufficiently long description.');
  await page.getByLabel('Start date and time').fill('2030-09-01T10:00');
  await page.getByLabel('End date and time').fill('2030-09-01T12:00');
  await page.getByRole('button', { name: 'Create event' }).click();

  await expect(page.locator('#slug-error')).toHaveCount(0);
  await expect.poll(() => observed.created?.slug).toBe('valid-event-slug');
});

test('an event photo is chosen from the media library and saved with the event', async ({
  page,
}) => {
  await page.route(/\/api\/v1\/admin\/media(\?|$)/, (route) =>
    respond(route, {
      data: [
        {
          id: '00000000-0000-4000-8000-000000001504',
          objectKey: 'media/family-day.jpg',
          publicUrl: 'http://127.0.0.1:4010/media/family-day.jpg',
          originalName: 'family-day.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2048,
          type: 'IMAGE',
          uploadedBy: adminId,
          createdAt: '2026-08-16T00:00:00.000Z',
          translations: [],
        },
      ],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    }),
  );
  const observed = await openEventAdmin(page);
  await page
    .getByRole('button', { name: /Family day/ })
    .first()
    .click();

  await page.getByRole('button', { name: 'Choose event photo' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Pictures come from the Media library');
  await dialog.getByRole('button', { name: 'family-day.jpg' }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole('button', { name: 'Save event' }).click();
  await expect
    .poll(() => observed.updated?.imageUrl)
    .toBe('http://127.0.0.1:4010/media/family-day.jpg');

  // Removing the photo must clear it on the server, not just on screen.
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect.poll(() => observed.updated?.imageUrl).toBeNull();
});

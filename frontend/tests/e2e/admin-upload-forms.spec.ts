import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';
import { API_ORIGIN } from '../helpers/test-endpoints';

const adminId = '00000000-0000-4000-8000-000000001601';
const mediaId = '00000000-0000-4000-8000-000000001602';
const galleryId = '00000000-0000-4000-8000-000000001603';
const now = '2026-08-01T10:00:00.000Z';

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const smallPng = { name: 'photo.png', mimeType: 'image/png', buffer: pngBytes };
const svg = {
  name: 'unsafe.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
};
const oversized = {
  name: 'huge.png',
  mimeType: 'image/png',
  buffer: Buffer.alloc(10_485_761, 1),
};

function mediaAsset() {
  return {
    id: mediaId,
    objectKey: 'media/photo.png',
    publicUrl: `${API_ORIGIN}/media/photo.png`,
    originalName: 'photo.png',
    mimeType: 'image/png',
    sizeBytes: 2048,
    type: 'IMAGE',
    uploadedBy: adminId,
    createdAt: now,
    translations: [
      {
        id: '00000000-0000-4000-8000-000000001604',
        mediaId,
        languageCode: 'en',
        altText: 'A classroom session',
        caption: null,
      },
    ],
  };
}

function galleryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: galleryId,
    mediaId: '00000000-0000-4000-8000-000000001605',
    type: 'IMAGE',
    mediaUrl: `${API_ORIGIN}/media/photo.png`,
    title: 'Family day',
    altText: 'Families gathered outdoors',
    languageCode: 'en',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type Observed = { uploaded?: Record<string, string>; patched?: Record<string, unknown> };

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
      value: 'upload-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'upload-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

async function openMedia(context: BrowserContext, page: Page) {
  await signIn(context, page);
  const observed: Observed = {};
  await page.route(/\/api\/v1\/admin\/media(\?|$)/, (route) =>
    respond(route, {
      data: [mediaAsset()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    }),
  );
  await page.route(/\/api\/v1\/admin\/media\/upload$/, (route) => {
    observed.uploaded = readMultipart(route);
    return respond(route, mediaAsset(), 201);
  });
  await page.route(/\/api\/v1\/admin\/media\/[0-9a-f-]+$/, (route) => respond(route, null));

  await page.goto('/admin/media');
  await waitForHydration(page);
  await expect(page.getByRole('form', { name: 'Upload media' })).toBeVisible();
  return observed;
}

async function openGallery(context: BrowserContext, page: Page) {
  await signIn(context, page);
  const observed: Observed = {};
  await page.route(/\/api\/v1\/public\/gallery(\?|$)/, (route) =>
    respond(route, {
      data: [galleryItem()],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    }),
  );
  await page.route(/\/api\/v1\/admin\/gallery(\?|$)/, (route) => {
    observed.uploaded = readMultipart(route);
    return respond(route, galleryItem({ title: observed.uploaded.title }), 201);
  });
  await page.route(/\/api\/v1\/admin\/gallery\/[0-9a-f-]+$/, (route) => {
    if (route.request().method() === 'DELETE') return respond(route, null);
    observed.patched = route.request().postDataJSON() as Record<string, unknown>;
    return respond(route, galleryItem(observed.patched));
  });

  await page.goto('/admin/gallery');
  await waitForHydration(page);
  await expect(page.getByRole('form', { name: 'Upload gallery item' })).toBeVisible();
  return observed;
}

test('media upload names the missing file rather than failing silently', async ({
  context,
  page,
}) => {
  const observed = await openMedia(context, page);
  const form = page.getByRole('form', { name: 'Upload media' });

  await form.getByRole('button', { name: 'Upload media' }).click();

  await expect(form.getByText('Choose a file to upload.')).toBeVisible();
  expect(observed.uploaded).toBeUndefined();
});

test('media upload states its limits before a file is rejected', async ({ context, page }) => {
  await openMedia(context, page);
  const form = page.getByRole('form', { name: 'Upload media' });

  await expect(
    form.getByText('Up to 10 MB. JPEG, PNG, GIF, WebP, MP4, WebM or PDF.'),
  ).toBeVisible();
});

test('media upload rejects a disallowed type and an oversized file at the field', async ({
  context,
  page,
}) => {
  const observed = await openMedia(context, page);
  const form = page.getByRole('form', { name: 'Upload media' });

  await page.locator('#media-file').setInputFiles(svg);
  await form.getByRole('button', { name: 'Upload media' }).click();
  await expect(form.getByText(/Allowed files/)).toBeVisible();
  expect(observed.uploaded).toBeUndefined();

  await page.locator('#media-file').setInputFiles(oversized);
  await form.getByRole('button', { name: 'Upload media' }).click();
  await expect(form.getByText('The file must be 10 MB or smaller.')).toBeVisible();
  expect(observed.uploaded).toBeUndefined();
});

test('an image without alternative text is refused on the alternative text field', async ({
  context,
  page,
}) => {
  const observed = await openMedia(context, page);
  const form = page.getByRole('form', { name: 'Upload media' });

  await page.locator('#media-file').setInputFiles(smallPng);
  await form.getByRole('button', { name: 'Upload media' }).click();

  await expect(page.locator('#media-alt-text')).toHaveAttribute(
    'aria-describedby',
    'media-alt-text-error',
  );
  await expect(form.getByText(/Alternative text is required for images/)).toBeVisible();
  expect(observed.uploaded).toBeUndefined();
});

test('a valid media upload sends the chosen values and clears the file input', async ({
  context,
  page,
}) => {
  const observed = await openMedia(context, page);
  const form = page.getByRole('form', { name: 'Upload media' });

  await page.locator('#media-file').setInputFiles(smallPng);
  await page.locator('#media-alt-text').fill('A classroom session');
  await page.locator('#media-caption').fill('Taken during a family workshop.');
  await page.locator('#media-language').selectOption('am');
  await form.getByRole('button', { name: 'Upload media' }).click();

  await expect(page.getByText('Media uploaded')).toBeVisible();
  expect(observed.uploaded).toMatchObject({
    languageCode: 'am',
    altText: 'A classroom session',
    caption: 'Taken during a family workshop.',
    folder: 'media',
  });

  // A stale filename in the control would invite a second upload of a file the
  // form no longer holds.
  await expect(page.locator('#media-file')).toHaveJSProperty('value', '');
  await expect(page.locator('#media-alt-text')).toHaveValue('');
  await expect(page.locator('#media-caption')).toHaveValue('');
});

test('gallery upload reports the file, title and alternative text separately', async ({
  context,
  page,
}) => {
  const observed = await openGallery(context, page);
  const form = page.getByRole('form', { name: 'Upload gallery item' });

  await form.getByRole('button', { name: 'Upload gallery item' }).click();

  await expect(form.getByText('Choose an image or video.')).toBeVisible();
  await expect(form.getByText('The title must contain at least 2 characters.')).toBeVisible();
  await expect(
    form.getByText('Alternative text must contain at least 2 characters.'),
  ).toBeVisible();
  expect(observed.uploaded).toBeUndefined();
});

test('a valid gallery upload sends its values and clears the file input', async ({
  context,
  page,
}) => {
  const observed = await openGallery(context, page);
  const form = page.getByRole('form', { name: 'Upload gallery item' });

  await page.locator('#gallery-file').setInputFiles(smallPng);
  await page.locator('#gallery-title').fill('Community picnic');
  await page.locator('#gallery-alt-text').fill('Families sharing a meal outdoors');
  await form.getByRole('button', { name: 'Upload gallery item' }).click();

  await expect(page.getByText('Gallery item uploaded')).toBeVisible();
  expect(observed.uploaded).toMatchObject({
    title: 'Community picnic',
    altText: 'Families sharing a meal outdoors',
    languageCode: 'en',
  });
  await expect(page.locator('#gallery-file')).toHaveJSProperty('value', '');
  await expect(page.locator('#gallery-title')).toHaveValue('');
});

test('each gallery row owns its fields and reports its own errors', async ({ context, page }) => {
  const observed = await openGallery(context, page);
  const row = page.getByRole('form', { name: 'Edit Family day' });

  const ids = await page
    .getByLabel('Title', { exact: true })
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);

  await row.getByLabel('Title', { exact: true }).fill('x');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(row.getByText('The title must contain at least 2 characters.')).toBeVisible();
  expect(observed.patched).toBeUndefined();

  await row.getByLabel('Title', { exact: true }).fill('Family gathering');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Gallery item saved')).toBeVisible();
  expect(observed.patched).toMatchObject({ title: 'Family gathering' });
});

test('a failed gallery save keeps the edits and explains why inside the row', async ({
  context,
  page,
}) => {
  await openGallery(context, page);
  const row = page.getByRole('form', { name: 'Edit Family day' });

  await page.route(/\/api\/v1\/admin\/gallery\/[0-9a-f-]+$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 409,
        message: 'Another gallery item already uses that title.',
      }),
    }),
  );

  await row.getByLabel('Title', { exact: true }).fill('Family gathering');
  await row.getByRole('button', { name: 'Save' }).click();

  await expect(row.getByRole('alert')).toContainText('already uses that title');
  await expect(row.getByLabel('Title', { exact: true })).toHaveValue('Family gathering');
});

test('deleting media and gallery items goes through a confirmation dialog', async ({
  context,
  page,
}) => {
  await openMedia(context, page);
  await page.getByRole('button', { name: 'Delete' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete media asset?');
  await expect(dialog).toContainText('photo.png');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'photo.png' })).toBeVisible();
});

function readMultipart(route: Route): Record<string, string> {
  const body = route.request().postData() ?? '';
  const fields: Record<string, string> = {};
  for (const match of body.matchAll(/name="([^"]+)"(?:; filename="([^"]*)")?\r?\n\r?\n/g)) {
    const [header, field, filename] = match;
    if (filename !== undefined) {
      fields[field] = filename;
      continue;
    }
    const start = (match.index ?? 0) + header.length;
    const end = body.indexOf('\r\n--', start);
    fields[field] = body.slice(start, end === -1 ? undefined : end);
  }
  return fields;
}

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

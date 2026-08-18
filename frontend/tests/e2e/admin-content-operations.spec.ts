import { expect, test, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000001401';
const now = '2026-08-12T10:00:00.000Z';

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
      value: 'step-42-refresh',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'step-42-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
});

test('media upload reports validation and progress before refreshing the list', async ({
  page,
}) => {
  let assets: unknown[] = [];
  await page.route('**/api/v1/admin/media?**', (route) => respond(route, paged(assets)));
  await page.route('**/api/v1/admin/media/upload', async (route) => {
    const asset = mediaAsset();
    assets = [asset];
    await new Promise((resolve) => setTimeout(resolve, 350));
    return respond(route, asset, 201);
  });
  await page.route(`**/api/v1/admin/media/${mediaAsset().id}`, (route) => {
    assets = [];
    return respond(route, { message: 'Media deleted successfully' });
  });
  await page.goto('/admin/media');
  await page.getByRole('button', { name: 'Upload media' }).click();
  await expect(page.getByText('Choose a file to upload.')).toBeVisible();
  await page.getByLabel('File').setInputFiles({
    name: 'family.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await page.getByLabel('Alternative text').fill('A family activity');
  await page.getByRole('button', { name: 'Upload media' }).click();
  await expect(page.getByText('Uploading', { exact: true })).toBeVisible();
  await expect(page.getByText('Media uploaded')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'family.png' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete media' }).click();
  await expect(page.getByText('There are no media assets yet.')).toBeVisible();
});

test('gallery upload and metadata editing preserve localized items', async ({ page }) => {
  let items: Record<string, unknown>[] = [];
  await page.route('**/api/v1/public/gallery?**', (route) => respond(route, paged(items)));
  await page.route('**/api/v1/admin/gallery', async (route) => {
    const item = galleryItem();
    items = [item];
    await new Promise((resolve) => setTimeout(resolve, 250));
    return respond(route, item, 201);
  });
  await page.route('**/api/v1/admin/gallery/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      items = [];
      return respond(route, { deleted: true });
    }
    const patch = route.request().postDataJSON() as Record<string, unknown>;
    items = items.map((item) => ({ ...item, ...patch }));
    return respond(route, items[0]);
  });
  await page.goto('/admin/gallery');
  await page.getByLabel('Image or video').setInputFiles({
    name: 'gallery.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff]),
  });
  await page.getByLabel('Title', { exact: true }).first().fill('Family celebration');
  await page
    .getByLabel('Alternative text', { exact: true })
    .first()
    .fill('Families celebrating together');
  await page.getByRole('button', { name: 'Upload gallery item' }).click();
  await expect(page.getByText('Gallery item uploaded')).toBeVisible();
  await page.getByLabel('Title', { exact: true }).last().fill('Updated celebration');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Gallery item saved')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete gallery item' }).click();
  await expect(page.getByText('There are no EN gallery items yet.')).toBeVisible();
});

test('blog workflows clearly transition from draft to published', async ({ page }) => {
  let posts: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/blog?**', (route) => respond(route, paged(posts)));
  await page.route('**/api/v1/admin/blog', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const post = blogPost(body);
    posts = [post];
    return respond(route, post, 201);
  });
  await page.route('**/api/v1/admin/blog/00000000-0000-4000-8000-000000001406', (route) => {
    if (route.request().method() === 'DELETE') {
      posts = [];
      return respond(route, { deleted: true });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    posts = posts.map((post) => ({ ...post, ...body, status: 'DRAFT', publishedAt: null }));
    return respond(route, posts[0]);
  });
  await page.route('**/api/v1/admin/blog/*/publish', (route) => {
    posts = posts.map((post) => ({ ...post, status: 'PUBLISHED', publishedAt: now }));
    return respond(route, posts[0]);
  });
  await page.goto('/admin/blog');
  await page.getByLabel('Slug').fill('family-story');
  await page.getByRole('textbox', { name: /^Title/ }).fill('Family story');
  await page.getByLabel('Excerpt').fill('A concise family story.');
  await page.getByLabel('Article content').fill('The full family story.');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByText('DRAFT', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('PUBLISHED', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Article content').fill('Updated family story.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('DRAFT', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete article' }).click();
  await expect(page.getByText('There are no articles yet.')).toBeVisible();
});

test('resource drafts publish explicitly from approved media URLs', async ({ page }) => {
  let resources: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/resources?**', (route) => respond(route, paged(resources)));
  await page.route('**/api/v1/admin/resources', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const resource = resourceItem(body);
    resources = [resource];
    return respond(route, resource, 201);
  });
  await page.route('**/api/v1/admin/resources/00000000-0000-4000-8000-000000001407', (route) => {
    resources = [];
    return respond(route, { deleted: true });
  });
  await page.route('**/api/v1/admin/resources/*/publish', (route) => {
    resources = resources.map((item) => ({ ...item, status: 'PUBLISHED' }));
    return respond(route, resources[0]);
  });
  await page.goto('/admin/resources');
  await page.getByLabel('Title').fill('Family guide');
  await page.getByLabel('File name').fill('family-guide.pdf');
  await page.getByLabel('Approved file URL').fill('http://127.0.0.1:4010/media/family-guide.pdf');
  await page.getByLabel('Description').fill('A guide for families.');
  await page.getByRole('button', { name: 'Create resource draft' }).click();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete resource' }).click();
  await expect(page.getByText('There are no resources yet.')).toBeVisible();
});

test('event RSVP CSV and iCal controls download actual files', async ({ page }) => {
  const event = eventItem();
  await page.route('**/api/v1/admin/events?**', (route) => respond(route, paged([event])));
  await page.route(`**/api/v1/admin/events/${event.id}`, (route) => {
    if (route.request().method() === 'DELETE') return respond(route, { deleted: true });
    return respond(route, {
      ...event,
      ...(route.request().postDataJSON() as Record<string, unknown>),
    });
  });
  await page.route('**/api/v1/admin/events/*/rsvps?page=**', (route) =>
    respond(
      route,
      paged([
        {
          id: '00000000-0000-4000-8000-000000001410',
          eventId: event.id,
          name: 'Test Attendee',
          email: 'attendee@example.org',
          attendees: 2,
          status: 'CONFIRMED',
          createdAt: now,
        },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/events/*/rsvps/export', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: { 'content-disposition': 'attachment; filename="event-rsvps.csv"' },
      body: 'name,email\r\nTest Attendee,attendee@example.org',
    }),
  );
  await page.route('**/api/v1/public/events/*/calendar.ics?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/calendar',
      headers: { 'content-disposition': 'attachment; filename="family-day.ics"' },
      body: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
    }),
  );
  await page.goto('/admin/events');
  await page.getByRole('button', { name: /Family day/ }).click();
  const icalDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download iCal' }).click();
  expect((await icalDownload).suggestedFilename()).toBe('family-day.ics');
  await page.getByRole('button', { name: 'Review RSVPs' }).click();
  await expect(page.getByText('attendee@example.org')).toBeVisible();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toBe('family-day-rsvps.csv');
  await page.getByLabel('Title', { exact: true }).fill('Updated family day');
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page.getByText('Event updated')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete event' }).click();
});

test('content editors never receive super-administrator destructive controls', async ({ page }) => {
  const editor = {
    id: adminId,
    email: 'editor@example.org',
    name: 'Content Editor',
    role: 'CONTENT_EDITOR',
  };
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'editor-access', expiresIn: 900, admin: editor }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, editor));
  await page.route('**/api/v1/admin/media?**', (route) => respond(route, paged([mediaAsset()])));
  await page.route('**/api/v1/public/gallery?**', (route) =>
    respond(route, paged([galleryItem()])),
  );
  await page.route('**/api/v1/admin/blog?**', (route) =>
    respond(
      route,
      paged([
        blogPost({
          slug: 'story',
          languageCode: 'en',
          title: 'Story',
          excerpt: 'Excerpt',
          content: 'Content',
        }),
      ]),
    ),
  );
  await page.route('**/api/v1/admin/resources?**', (route) =>
    respond(
      route,
      paged([
        resourceItem({
          title: 'Guide',
          description: 'Guide description',
          fileUrl: 'http://127.0.0.1:4010/media/guide.pdf',
          fileName: 'guide.pdf',
          mimeType: 'application/pdf',
          languageCode: 'en',
        }),
      ]),
    ),
  );
  await page.route('**/api/v1/admin/events?**', (route) => respond(route, paged([eventItem()])));

  for (const path of ['/admin/media', '/admin/gallery', '/admin/resources']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
  }
  await page.goto('/admin/blog');
  await page.getByRole('button', { name: /Story/ }).click();
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
  await page.goto('/admin/events');
  await page.getByRole('button', { name: /Family day/ }).click();
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
});

function mediaAsset() {
  return {
    id: '00000000-0000-4000-8000-000000001402',
    objectKey: 'media/2026/08/file.png',
    publicUrl: 'http://127.0.0.1:4010/media/family.png',
    originalName: 'family.png',
    mimeType: 'image/png',
    sizeBytes: 4,
    type: 'IMAGE',
    uploadedBy: adminId,
    createdAt: now,
    translations: [
      {
        id: '00000000-0000-4000-8000-000000001403',
        mediaId: '00000000-0000-4000-8000-000000001402',
        languageCode: 'en',
        altText: 'A family activity',
        caption: null,
      },
    ],
  };
}
function galleryItem() {
  return {
    id: '00000000-0000-4000-8000-000000001404',
    mediaId: '00000000-0000-4000-8000-000000001405',
    title: 'Family celebration',
    altText: 'Families celebrating together',
    languageCode: 'en',
    mediaUrl: 'http://127.0.0.1:4010/assets/gallery_1.jpg',
    type: 'IMAGE',
    createdAt: now,
    updatedAt: now,
  };
}
function blogPost(body: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000001406',
    ...body,
    status: 'DRAFT',
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    createdBy: adminId,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
function resourceItem(body: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000001407',
    ...body,
    status: 'DRAFT',
    downloadCount: 0,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  };
}
function eventItem() {
  return {
    id: '00000000-0000-4000-8000-000000001408',
    translationKey: '00000000-0000-4000-8000-000000001409',
    slug: 'family-day',
    title: 'Family day',
    description: 'A family event.',
    startDate: '2030-08-12T10:00:00.000Z',
    endDate: '2030-08-12T12:00:00.000Z',
    location: 'Addis Ababa',
    rsvpEnabled: true,
    status: 'PUBLISHED',
    languageCode: 'en',
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  };
}
function paged(data: unknown[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 12, totalPages: data.length ? 1 : 0 },
  };
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

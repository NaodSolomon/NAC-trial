import { expect, test, type Page, type Route } from '@playwright/test';

const pageId = '00000000-0000-4000-8000-000000001101';
const adminId = '00000000-0000-4000-8000-000000001102';
const translationKey = '00000000-0000-4000-8000-000000001103';
const administrator = {
  id: adminId,
  email: 'editor@example.org',
  name: 'Content Editor',
  role: 'CONTENT_EDITOR',
} as const;
type MockCmsPage = ReturnType<typeof createPage>;

test.beforeEach(async ({ context, page }) => {
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
    respond(route, { accessToken: 'cms-access', expiresIn: 900, admin: administrator }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, administrator));
});

test('CMS list exposes filters, pagination metadata, and explicit statuses', async ({ page }) => {
  await mockCmsApi(page);
  await page.goto('/admin/content');
  await expect(page.getByRole('heading', { name: 'CMS pages' })).toBeVisible();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await page.getByLabel('Status').selectOption('DRAFT');
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await page.getByLabel('Language').selectOption('am');
  await expect(page).toHaveURL(/language=am/);
});

test('failed CMS updates preserve content and published edits explicitly return to draft', async ({
  page,
}) => {
  await mockCmsApi(page);
  await page.goto(`/admin/content/${pageId}`);
  await expect(page.getByText(/saving any edit returns this page to DRAFT/)).toBeVisible();
  const content = page.getByLabel('Page content');
  await content.fill('Unsaved failure content');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText(/unsaved content remains in the editor/)).toBeVisible();
  await expect(content).toHaveValue('Unsaved failure content');

  await content.fill('Reviewed updated content');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await expect(page.getByText(/returned to draft/)).toBeVisible();
});

test('publishing and local scheduling are separate explicit workflows', async ({ page }) => {
  const api = await mockCmsApi(page);
  await page.goto(`/admin/content/${pageId}`);
  await page.getByLabel('Page content').fill('Draft ready for publication');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Schedule' }).click();
  await page.getByLabel('Local publication date and time').fill('2030-01-02T12:30');
  await page.getByRole('button', { name: 'Confirm schedule' }).click();
  await expect(page.getByText('SCHEDULED', { exact: true })).toBeVisible();
  expect(api.lastSchedule).toMatch(/^2030-01-02T\d{2}:30:00\.000Z$/);
});

test('homepage and FAQ editors create structured metadata and preview generic content safely', async ({
  page,
}) => {
  const api = await mockCmsApi(page);
  await page.goto('/admin/content/new');
  await fillBaseEditor(page, 'home-demo');
  await page.getByLabel('Content structure').selectOption('homepage');
  await page.getByLabel('Hero heading').fill('Welcome families');
  await page.getByLabel('Services heading').fill('Our services');
  await page.getByLabel('Location heading').fill('Visit the center');
  await page
    .getByLabel('Google Maps embed URL')
    .fill('https://www.google.com/maps/embed?pb=nehemiah-autism-center');
  await page.getByLabel('Call-to-action heading').fill('Support our work');
  await page.getByLabel('Call-to-action label').fill('Donate');
  await page.getByLabel('Call-to-action link').fill('/donate');
  await page.getByRole('button', { name: 'Add service' }).click();
  await page.getByLabel('Service 1 title').fill('Family support');
  await page.getByLabel('Service 1 description').fill('Guidance for families.');
  await page.getByRole('button', { name: 'Check availability' }).click();
  await expect(page.getByText('Slug is available.')).toBeVisible();
  await page.getByRole('button', { name: 'Create draft' }).click();
  expect(api.lastCreated?.metadata).toMatchObject({
    sections: [
      { type: 'hero', heading: 'Welcome families' },
      { type: 'services', heading: 'Our services', items: [{ title: 'Family support' }] },
      {
        type: 'location',
        heading: 'Visit the center',
        mapEmbedUrl: 'https://www.google.com/maps/embed?pb=nehemiah-autism-center',
      },
      { type: 'callToAction', action: { label: 'Donate', href: '/donate' } },
    ],
  });

  await page.goto('/admin/content/new');
  await fillBaseEditor(page, 'faq-demo');
  await page.getByLabel('Content structure').selectOption('faq');
  await page.getByRole('button', { name: 'Add FAQ' }).click();
  await page.getByLabel('Question').fill('How can families get help?');
  await page.getByLabel('Answer').fill('Contact our support team.');
  await expect(page.getByText('FAQ 1')).toBeVisible();

  await page.getByLabel('Content structure').selectOption('generic');
  await page
    .getByLabel('Page content')
    .fill('<script>unsafe()</script><strong>Safe preview text</strong>');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText('Safe preview text')).toBeVisible();
  await expect(page.locator('[aria-label="Content preview"] script')).toHaveCount(0);
  await expect(page.locator('[aria-label="Content preview"] strong')).toHaveCount(0);
});

test('SEO editor matches backend limits and preserves failed edits', async ({ page }) => {
  const api = await mockCmsApi(page);
  await page.goto('/admin/seo');
  await expect(page.getByRole('heading', { name: 'SEO metadata' })).toBeVisible();
  await page.getByLabel('SEO title').fill('Failing title');
  await page.getByLabel('SEO description').fill('Unsaved search description');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();
  await expect(page.getByText(/unsaved SEO fields remain unchanged/)).toBeVisible();
  await expect(page.getByLabel('SEO description')).toHaveValue('Unsaved search description');

  await page.getByLabel('SEO title').fill('Autism Support Ethiopia');
  await page
    .getByLabel('SEO description')
    .fill('Programs and support for autistic children and families.');
  await page.getByLabel(/Keywords/).fill('Autism, Ethiopia, AUTISM, Families');
  await page.getByLabel('Social image URL').fill('https://media.example.org/seo.jpg');
  await page.getByRole('button', { name: 'Save SEO metadata' }).click();
  await expect(page.getByText('SEO metadata saved')).toBeVisible();
  expect(api.lastSeo).toMatchObject({
    title: 'Autism Support Ethiopia',
    keywords: ['autism', 'ethiopia', 'families'],
    imageUrl: 'https://media.example.org/seo.jpg',
  });
});

async function fillBaseEditor(page: Page, slug: string) {
  await page.getByLabel('Title').fill('Demonstration page');
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Page content').fill('Demonstration introduction.');
}

async function mockCmsApi(page: Page) {
  let cmsPage: MockCmsPage = createPage();
  const observed: {
    lastSchedule?: string;
    lastCreated?: Record<string, unknown>;
    lastSeo?: Record<string, unknown>;
  } = {};
  await page.route('**/api/v1/admin/slugs/check?**', (route) => {
    const url = new URL(route.request().url());
    return respond(route, {
      slug: url.searchParams.get('slug'),
      languageCode: url.searchParams.get('languageCode'),
      available: true,
    });
  });
  await page.route('**/api/v1/admin/seo/**', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    if (body.title === 'Failing title') return fail(route, 503);
    observed.lastSeo = body;
    return respond(route, {
      slug: cmsPage.slug,
      languageCode: body.languageCode,
      title: body.title || cmsPage.title,
      description: body.description,
      keywords: body.keywords,
      imageUrl: body.imageUrl,
    });
  });
  await page.route('**/api/v1/admin/cms/pages**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET' && path.endsWith(`/${pageId}`)) return respond(route, cmsPage);
    if (request.method() === 'GET') {
      const status = url.searchParams.get('status');
      const listed = status === 'DRAFT' ? [{ ...cmsPage, status: 'DRAFT' }] : [cmsPage];
      return respond(route, {
        data: listed,
        meta: {
          total: listed.length,
          page: Number(url.searchParams.get('page') ?? 1),
          limit: 10,
          totalPages: 1,
        },
      });
    }
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    if (request.method() === 'POST' && path.endsWith('/pages')) {
      observed.lastCreated = body;
      cmsPage = {
        ...createPage(),
        ...body,
        id: '00000000-0000-4000-8000-000000001111',
        status: 'DRAFT',
      } as MockCmsPage;
      return respond(route, cmsPage, 201);
    }
    if (request.method() === 'PATCH' && path.endsWith(`/${pageId}`)) {
      if (body.content === 'Unsaved failure content') return fail(route, 503);
      cmsPage = {
        ...cmsPage,
        ...body,
        status: 'DRAFT',
        publishedAt: null,
        scheduledAt: null,
        updatedAt: new Date().toISOString(),
      };
      return respond(route, cmsPage);
    }
    if (request.method() === 'POST' && path.endsWith('/publish')) {
      cmsPage = {
        ...cmsPage,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        scheduledAt: null,
      };
      return respond(route, cmsPage);
    }
    if (request.method() === 'POST' && path.endsWith('/schedule')) {
      observed.lastSchedule = String(body.scheduledAt);
      cmsPage = {
        ...cmsPage,
        status: 'SCHEDULED',
        scheduledAt: body.scheduledAt as string,
        publishedAt: null,
      };
      return respond(route, cmsPage);
    }
    if (request.method() === 'DELETE')
      return respond(route, { message: 'CMS page deleted successfully' });
    return fail(route, 404);
  });
  return observed;
}

function createPage(): {
  [key: string]: unknown;
  id: string;
  slug: string;
  languageCode: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
} {
  return {
    id: pageId,
    translationKey,
    slug: 'home',
    languageCode: 'en',
    title: 'Homepage',
    content: 'Published homepage content.',
    status: 'PUBLISHED',
    metadata: {},
    seoTitle: 'Homepage SEO',
    seoDescription: 'Homepage search description.',
    seoImageUrl: null,
    seoKeywords: ['autism'],
    createdBy: adminId,
    scheduledAt: null,
    publishedAt: '2026-08-11T10:00:00.000Z',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-11T10:00:00.000Z',
  };
}

async function respond(route: Route, data: unknown, status = 200) {
  await route.fulfill({
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
async function fail(route: Route, status: number) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, statusCode: status, message: 'Simulated failure' }),
  });
}

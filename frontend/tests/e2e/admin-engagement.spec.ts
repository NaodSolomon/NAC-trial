import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const adminId = '00000000-0000-4000-8000-000000004300';
const contactId = '00000000-0000-4000-8000-000000004301';
const volunteerId = '00000000-0000-4000-8000-000000004302';
const testimonialId = '00000000-0000-4000-8000-000000004303';
const translationKey = '00000000-0000-4000-8000-000000004304';
const subscriberId = '00000000-0000-4000-8000-000000004305';
const privateEmail = 'subscriber.private@example.org';
const now = '2026-08-12T09:00:00.000Z';

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, page, 'SUPER_ADMIN');
});

test('reviews, filters, paginates and deletes contact submissions without PII feedback', async ({
  page,
}) => {
  let records = [contact()];
  let requested = '';
  await page.route('**/api/v1/admin/contact?**', (route) => {
    requested = route.request().url();
    return respond(route, paged(records));
  });
  await page.route(`**/api/v1/admin/contact/${contactId}`, (route) => {
    records = [];
    return respond(route, { message: 'Contact submission deleted successfully' });
  });
  await page.goto('/admin/contact');
  await expect(page.getByText('family.private@example.org')).toBeVisible();
  await page.getByPlaceholder('Search name, email or subject').fill('family');
  await page.getByLabel('Filter by language').selectOption('en');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect.poll(() => requested).toContain('search=family');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete submission' }).click();
  await expect(page.getByText('No records match these filters.')).toBeVisible();
  await expect(page.getByText('Contact submission deleted')).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText('family.private@example.org');
});

test('reviews volunteer applications with status filtering and super-admin deletion', async ({
  page,
}) => {
  let records = [volunteer()];
  let requested = '';
  await page.route('**/api/v1/admin/volunteers?**', (route) => {
    requested = route.request().url();
    return respond(route, paged(records));
  });
  await page.route(`**/api/v1/admin/volunteers/${volunteerId}`, (route) => {
    records = [];
    return respond(route, { message: 'Volunteer application deleted successfully' });
  });
  await page.goto('/admin/volunteers');
  await expect(page.getByText('Family support')).toBeVisible();
  await page.getByLabel('Application status').selectOption('PENDING');
  await expect.poll(() => requested).toContain('status=PENDING');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete application' }).click();
  await expect(page.getByText('No records match these filters.')).toBeVisible();
});

test('creates, publishes, updates and deletes testimonials through the moderation queue', async ({
  page,
}) => {
  let records: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/testimonials?**', (route) => respond(route, paged(records)));
  await page.route('**/api/v1/admin/testimonials', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const created = testimonial({ ...body, id: testimonialId });
    records = [created];
    return respond(route, created, 201);
  });
  await page.route(`**/api/v1/admin/testimonials/${testimonialId}`, (route) => {
    if (route.request().method() === 'DELETE') {
      records = [];
      return respond(route, { message: 'Testimonial deleted successfully' });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    records = records.map((record) => ({ ...record, ...body, updatedAt: now }));
    return respond(route, records[0]);
  });
  await page.goto('/admin/testimonials');
  await page.getByLabel('Name').fill('Family advocate');
  await page
    .getByRole('textbox', { name: 'Testimonial' })
    .fill('The center gave our family meaningful support.');
  await page.getByLabel('Visibility').selectOption('PUBLISHED');
  await page.getByRole('button', { name: 'Save testimonial' }).click();
  await expect(page.getByText('Testimonial created')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Testimonial' })
    .fill('The center gave our family practical and meaningful support.');
  await page.getByRole('button', { name: 'Save testimonial' }).click();
  await expect(page.getByText('Testimonial updated')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete testimonial' }).click();
  await expect(page.getByText('No records match these filters.')).toBeVisible();
});

test('newsletter removal keeps the address out of client logs, analytics and feedback', async ({
  page,
}) => {
  let records = [subscriber()];
  const consoleMessages: string[] = [];
  const analyticsPayloads: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('request', (request) => {
    if (request.url().includes('/analytics')) analyticsPayloads.push(request.postData() ?? '');
  });
  await page.route('**/api/v1/admin/newsletter?**', (route) => respond(route, paged(records)));
  await page.route(`**/api/v1/admin/newsletter/${encodeURIComponent(privateEmail)}`, (route) => {
    records = [];
    return respond(route, { message: 'Newsletter subscriber deleted successfully' });
  });
  await page.goto('/admin/newsletter');
  await expect(page.getByText(privateEmail)).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('button', { name: 'Remove subscriber' }).click();
  await expect(page.getByText('No records match these filters.')).toBeVisible();
  await expect(page.getByText('Newsletter subscriber removed')).toBeVisible();
  expect(consoleMessages.join(' ')).not.toContain(privateEmail);
  expect(analyticsPayloads.join(' ')).not.toContain(privateEmail);
  await expect(page.getByRole('status')).not.toContainText(privateEmail);
});

test('content editors can review private records but cannot delete or access subscribers', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'CONTENT_EDITOR');
  await page.route('**/api/v1/admin/contact?**', (route) => respond(route, paged([contact()])));
  await page.goto('/admin/contact');
  await expect(page.getByText('family.private@example.org')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: 'Administrator navigation' });
  await expect(navigation.getByRole('link', { name: 'Testimonials' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Newsletter' })).toHaveCount(0);
  await page.goto('/admin/newsletter');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
});

async function authenticate(
  context: BrowserContext,
  page: Page,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR',
) {
  const admin = { id: adminId, email: 'admin@example.org', name: 'Administrator', role };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: `step-43-${role}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    respond(route, { accessToken: 'step-43-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}

function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, statusCode: status, timestamp: now }),
  });
}
function paged(data: unknown[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 },
  };
}
function contact() {
  return {
    id: contactId,
    name: 'Private Family',
    email: 'family.private@example.org',
    subject: 'Support request',
    message: 'Please contact our family about available support.',
    languageCode: 'en',
    createdAt: now,
  };
}
function volunteer() {
  return {
    id: volunteerId,
    name: 'Private Volunteer',
    email: 'volunteer.private@example.org',
    phone: '+251911000000',
    roleInterest: 'Family support',
    message: 'I would like to volunteer with family programs.',
    languageCode: 'en',
    status: 'PENDING',
    createdAt: now,
  };
}
function testimonial(overrides: Record<string, unknown> = {}) {
  return {
    id: testimonialId,
    translationKey,
    name: 'Family advocate',
    text: 'The center gave our family meaningful support.',
    languageCode: 'en',
    status: 'PUBLISHED',
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
function subscriber() {
  return { id: subscriberId, email: privateEmail, languageCode: 'en', createdAt: now };
}

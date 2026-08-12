import { expect, test } from '@playwright/test';

test('bilingual discovery, search, and tracked resource download use real services', async ({
  page,
}) => {
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every child');
  await page.getByLabel('Language').first().selectOption('am');
  await expect(page).toHaveURL(/lang=am/);

  await page.goto('/search?lang=en&q=autism');
  await expect(page.getByRole('status').filter({ hasText: /results for/i })).toBeVisible();

  await page.goto('/resources?lang=en');
  const resource = page.getByRole('article').filter({ hasText: 'Family support guide' });
  const initialDownloads = Number((await resource.getByText(/\d+ downloads/).textContent())?.match(/\d+/)?.[0]);
  page.on('popup', (popup) => void popup.close());
  await resource.getByRole('button', { name: 'Download' }).click();
  await expect(resource).toContainText(`${initialDownloads + 1} downloads`);
});

test('RSVP, contact, volunteer, and fake donation complete without external accounts', async ({
  page,
  request,
}) => {
  const run = `${Date.now()}-${test.info().retry}`;
  const donorEmail = `donor-${run}@nehemiah.test`;
  await page.goto('/events/family-support-day?lang=en');
  await page.getByLabel('Name').fill('E2E Family');
  await page.getByLabel('Email').fill(`rsvp-${run}@nehemiah.test`);
  await page.getByLabel('Number of attendees').fill('2');
  await page.getByRole('button', { name: 'Confirm RSVP' }).click();
  await expect(page.getByRole('status').filter({ hasText: /RSVP is confirmed/i })).toBeVisible();

  await page.goto('/contact?lang=en');
  await page.getByLabel('Your name').fill('E2E Family');
  await page.getByLabel('Email address').fill(`contact-${run}@nehemiah.test`);
  await page.getByLabel('Message').fill('Disposable full-stack contact journey message.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status').filter({ hasText: /message was sent/i })).toBeVisible();

  await page.goto('/volunteer?lang=en');
  const volunteerForm = page.getByRole('region', { name: 'Register your interest' });
  await volunteerForm.getByLabel('Name').fill('E2E Volunteer');
  await volunteerForm.getByLabel('Email address').fill(`volunteer-${run}@nehemiah.test`);
  await volunteerForm.getByLabel(/Phone/).fill('+251911000000');
  await volunteerForm.getByLabel('Area of interest').fill('Inclusive event support');
  await volunteerForm
    .getByLabel('Tell us about your experience and interest')
    .fill('I am available on weekends for family activities.');
  await volunteerForm.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('status').filter({ hasText: /application was submitted/i })).toBeVisible();

  await page.goto('/donate?lang=en');
  await expect(page.getByLabel('Trial mode')).toBeVisible();
  await page.getByLabel('Name').fill('E2E Donor');
  await page.getByLabel('Email address').fill(donorEmail);
  await page.getByLabel('Custom amount').fill('25');
  await page.getByRole('button', { name: 'Create trial donation' }).click();
  await page.waitForURL(/\/donate\/simulated\?donation=/, {
    timeout: 60_000,
    waitUntil: 'domcontentloaded',
  });
  const confirmButton = page.getByRole('button', { name: 'Confirm simulation' });
  let confirmationResponse: import('@playwright/test').Response | null = null;
  for (let attempt = 0; attempt < 3 && !confirmationResponse; attempt += 1) {
    const response = page
      .waitForResponse(
        (candidate) =>
          candidate.request().method() === 'POST' &&
          /\/api\/v1\/test\/payments\/[^/]+\/confirm$/.test(candidate.url()),
        { timeout: 5_000 },
      )
      .catch(() => null);
    await confirmButton.click();
    confirmationResponse = await response;
  }
  expect(confirmationResponse?.ok()).toBe(true);
  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open test receipt' })).toBeVisible();
  await expect
    .poll(async () => {
      const response = await request.get(
        `${process.env.E2E_MAILPIT_URL ?? 'http://localhost:8027'}/api/v1/messages`,
      );
      const body = (await response.json()) as {
        messages?: Array<{ To?: Array<{ Address?: string }>; Subject?: string }>;
      };
      return body.messages?.some(
        (message) =>
          message.Subject?.includes('simulated') &&
          message.To?.some((recipient) => recipient.Address === donorEmail),
      );
    })
    .toBe(true);
});

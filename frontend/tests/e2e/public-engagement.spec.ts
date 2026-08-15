import { expect, test, type Page } from '@playwright/test';

test('contact content and map use only the approved privacy-preserving embed', async ({ page }) => {
  await page.route('https://www.google.com/**', (route) => route.abort());
  await page.goto('/contact?lang=en');

  const contactInformation = page.getByLabel('Contact information');
  await expect(contactInformation.getByText('support@nehemiah.org')).toBeVisible();
  await expect(contactInformation.getByText('Addis Ababa, Ethiopia')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load secure map' }).click();
  const map = page.getByTitle('Map of Nehemiah Autism Center');
  await expect(map).toHaveAttribute('src', /^https:\/\/www\.google\.com\/maps/);
  await expect(map).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(map).toHaveAttribute('sandbox', /allow-scripts/);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('contact form is keyboard-usable, duplicate-safe, and keeps PII out of client surfaces', async ({
  page,
}) => {
  const email = 'step37-contact@example.org';
  const consoleMessages: string[] = [];
  const submissionUrls: string[] = [];
  let submissions = 0;
  page.on('console', (message) => consoleMessages.push(message.text()));
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/public/contact')) {
      submissions += 1;
      submissionUrls.push(request.url());
    }
  });
  await page.goto('/contact?lang=en');

  await page.getByLabel('Your name').focus();
  await page.keyboard.type('Step 37 Family');
  await page.keyboard.press('Tab');
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Family support');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Please share information about the available family support services.');
  const submit = page.getByRole('button', { name: 'Send message' });
  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page.getByRole('status')).toContainText('Your message was sent');
  expect(submissions).toBe(1);
  expect(submissionUrls.join(' ')).not.toContain(email);
  expect(consoleMessages.join(' ')).not.toContain(email);
  await expectNoStoredPii(page, email);
  expect(page.url()).not.toContain(email);
});

test('contact form exposes validation, rate-limit, and availability states', async ({ page }) => {
  await page.goto('/contact?lang=en');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('This field is required.').first()).toBeVisible();

  await submitContact(page, 'rate-limit@example.org');
  await expect(page.getByText(/Too many requests were sent/)).toBeVisible();
  await submitContact(page, 'unavailable@example.org');
  await expect(page.getByText(/temporarily unavailable.*was not submitted/)).toBeVisible();
});

test('volunteer page shows published testimonials and handles every form state', async ({
  page,
}) => {
  await page.goto('/volunteer?lang=en');
  await expect(page.getByRole('heading', { name: 'Voices from our community' })).toBeVisible();
  await expect(page.getByText('private-administrator-id')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Please provide more information.').first()).toBeVisible();

  let submissions = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/public/volunteer/apply')) {
      submissions += 1;
    }
  });
  await fillVolunteer(page, 'step37-volunteer@example.org');
  const submit = page.getByRole('button', { name: 'Submit application' });
  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole('status')).toContainText('application was submitted');
  expect(submissions).toBe(1);

  await fillVolunteer(page, 'rate-limit@example.org');
  await submit.click();
  await expect(page.getByText(/Too many requests were sent/)).toBeVisible();
  await fillVolunteer(page, 'unavailable@example.org');
  await submit.click();
  await expect(page.getByText(/temporarily unavailable.*was not submitted/)).toBeVisible();
});

test('newsletter is validated, duplicate-safe, and reports service failures', async ({ page }) => {
  await page.goto('/?lang=en');
  const email = page.getByLabel('Email address');
  const submit = page.getByRole('button', { name: 'Subscribe' });
  await submit.click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  let submissions = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/public/newsletter'))
      submissions += 1;
  });
  await email.fill('step37-newsletter@example.org');
  await submit.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole('status')).toContainText('You are subscribed');
  expect(submissions).toBe(1);

  await email.fill('rate-limit@example.org');
  await submit.click();
  await expect(page.getByText(/Too many requests were sent/)).toBeVisible();
  await email.fill('unavailable@example.org');
  await submit.click();
  await expect(page.getByText(/temporarily unavailable.*was not submitted/)).toBeVisible();
});

async function submitContact(page: Page, email: string) {
  await page.getByLabel('Your name').fill('Step 37 Family');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Subject (optional)').fill('Family support');
  await page
    .getByLabel('Message')
    .fill('Please share information about the available family support services.');
  await page.getByRole('button', { name: 'Send message' }).click();
}

async function fillVolunteer(page: Page, email: string) {
  await page.getByLabel('Your name').fill('Step 37 Volunteer');
  await page.getByLabel('Email address').first().fill(email);
  await page.getByLabel('Phone number').fill('+251 911 234 567');
  await page.getByLabel('Role of interest').selectOption('Event support');
  await page
    .getByLabel('Tell us about your experience and interest')
    .fill('I would like to support inclusive events and help families feel welcome.');
}

async function expectNoStoredPii(page: Page, value: string) {
  const stored = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(stored)).not.toContain(value);
}

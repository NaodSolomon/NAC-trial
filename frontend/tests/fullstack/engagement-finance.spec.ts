import { expect, test } from '@playwright/test';
import { login } from './fullstack.helpers';

test('@extended public engagement and simulated finance records appear in authorized real dashboards', async ({
  browser,
  page,
}) => {
  const run = Date.now();
  const subject = `E2E review ${run}`;
  const contactEmail = `review-contact-${run}@nehemiah.test`;
  const donorEmail = `review-donor-${run}@nehemiah.test`;

  await page.goto('/contact?lang=en');
  await page.getByLabel('Your name').fill('Full-stack Review Family');
  await page.getByLabel('Email address').fill(contactEmail);
  await page.getByLabel('Subject (optional)').fill(subject);
  await page.getByLabel('Message').fill('Please review this real-service contact submission.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('message was sent');

  await page.goto('/donate?lang=en');
  await page.getByLabel('Name').fill('Full-stack Trial Donor');
  await page.getByLabel('Email address').fill(donorEmail);
  await page.getByLabel('Custom amount').fill('35');
  await page.getByRole('button', { name: 'Create trial donation' }).click();
  await page.waitForURL(/\/donate\/simulated\?donation=/, { timeout: 60_000 });
  const confirmButton = page.getByRole('button', { name: 'Confirm simulation' });
  let confirmationSucceeded = false;
  for (let attempt = 0; attempt < 3 && !confirmationSucceeded; attempt += 1) {
    const response = page
      .waitForResponse(
        (candidate) =>
          candidate.request().method() === 'POST' &&
          /\/api\/v1\/test\/payments\/[^/]+\/confirm$/.test(candidate.url()),
        { timeout: 5_000 },
      )
      .catch(() => null);
    await confirmButton.click();
    confirmationSucceeded = Boolean((await response)?.ok());
  }
  expect(confirmationSucceeded).toBe(true);
  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
  const editorContext = await browser.newContext({ baseURL });
  const financeContext = await browser.newContext({ baseURL });
  try {
    const editorPage = await editorContext.newPage();
    await login(editorPage, 'e2e-editor@nehemiah.test');
    await editorPage.goto('/admin/contact');
    await editorPage.getByPlaceholder('Search name, email or subject').fill(subject);
    await editorPage.getByRole('button', { name: 'Apply filters' }).click();
    await expect(editorPage.getByRole('heading', { name: subject })).toBeVisible();
    await expect(editorPage.getByText(contactEmail)).toBeVisible();

    const financePage = await financeContext.newPage();
    await login(financePage, 'e2e-finance@nehemiah.test');
    await financePage.goto('/admin/donations');
    await financePage.getByLabel('Donation status').selectOption('CONFIRMED');
    await expect(financePage.getByText(donorEmail)).toBeVisible();
    await expect(
      financePage.getByText('Trial finance data — no real money collected'),
    ).toBeVisible();
  } finally {
    await editorContext.close();
    await financeContext.close();
  }
});

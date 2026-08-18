import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from '../helpers/hydration';
import { API_ORIGIN } from '../helpers/test-endpoints';

const simulationPattern = (action: 'confirm' | 'fail') =>
  new RegExp(`/api/v1/test/payments/[0-9a-f-]+/${action}$`, 'i');
const cancelPattern = /\/api\/v1\/public\/donations\/[0-9a-f-]+\/cancel$/i;
const donationReadPattern = /\/api\/v1\/public\/donations\/[0-9a-f-]+$/i;

test('trial donation requests only approved fields and creates once across refresh', async ({
  page,
}) => {
  const donorEmail = 'step38-donor@example.org';
  const requestBodies: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/public/donations')) {
      requestBodies.push(request.postDataJSON());
    }
  });

  await page.goto('/donate?lang=en');
  await waitForHydration(page);
  await expect(page.getByLabel('Trial mode')).toBeVisible();
  await expect(page.getByText(/No real money is collected/).first()).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Custom amount')).toBeVisible();
  await expect(page.getByLabel('Currency')).toBeVisible();
  await expect(page.getByLabel('Message (optional)')).toBeVisible();
  await expect(
    page.locator('input[name*="card" i], input[name*="bank" i], input[name="phone"]'),
  ).toHaveCount(0);

  await page.getByLabel('Name').fill('Step 38 Donor');
  await page.getByLabel('Email address').fill(donorEmail);
  await page.getByLabel('Custom amount').fill('75.25');
  await page.getByLabel('Message (optional)').fill('Trial donation only');

  // Without a React-owned handler the two clicks below would be dropped rather than
  // de-duplicated, and the single recorded request would prove nothing about idempotency.
  const create = page.getByRole('button', { name: 'Create trial donation' });
  const ownedByReact = await create.evaluate((button: HTMLButtonElement) =>
    Object.keys(button).some((key) => key.startsWith('__reactProps$')),
  );
  expect(ownedByReact).toBe(true);
  await create.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page).toHaveURL(/\/donate\/simulated\?donation=[0-9a-f-]+$/);
  expect(requestBodies).toHaveLength(1);
  expect(requestBodies[0]).toEqual({
    donorName: 'Step 38 Donor',
    donorEmail,
    amount: 75.25,
    currency: 'USD',
    message: 'Trial donation only',
    gateway: 'SIMULATED',
  });
  expect(page.url()).not.toContain(donorEmail);
  expect(page.url()).not.toContain('Step 38 Donor');

  await page.reload();
  await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
  expect(requestBodies).toHaveLength(1);
  await expectNoStoredPii(page, donorEmail);
  await expectNoStoredPii(page, 'Step 38 Donor');
});

test('trial checkout confirms idempotently and exposes a test receipt', async ({ page }) => {
  await createDonation(page, 'step38-confirm@example.org');
  const donationId = new URL(page.url()).searchParams.get('donation');
  expect(donationId).toBeTruthy();

  await runTrialAction(page, 'Confirm simulation', simulationPattern('confirm'));
  await expect(page.getByText('CONFIRMED', { exact: true })).toBeVisible();
  await expect(page.getByText(/No real money was collected/)).toBeVisible();
  const receipt = page.getByRole('link', { name: 'Open test receipt' });
  await expect(receipt).toHaveAttribute('href', /\/downloads\/test-receipt\.pdf$/);

  const duplicate = await page.request.post(
    `${API_ORIGIN}/api/v1/test/payments/${donationId}/confirm`,
  );
  expect(duplicate.ok()).toBe(true);
  expect((await duplicate.json()).data).toMatchObject({
    donationId,
    status: 'CONFIRMED',
    duplicate: true,
  });
});

test('trial checkout supports failure and cancellation as terminal states', async ({ page }) => {
  await createDonation(page, 'step38-fail@example.org');
  await runTrialAction(page, 'Simulate failure', simulationPattern('fail'));
  await expect(page.getByText('FAILED', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open test receipt' })).toHaveCount(0);

  await createDonation(page, 'step38-cancel@example.org');
  await runTrialAction(page, 'Cancel', cancelPattern);
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm simulation' })).toHaveCount(0);
});

// Each control posts an action and then re-reads the donation, so the rendered status
// trails the click by two round trips. Waiting for the action response keeps the
// assertion independent of how long the development server takes to answer.
async function runTrialAction(page: Page, name: string, pattern: RegExp) {
  const action = page.waitForResponse(
    (response) => pattern.test(response.url()) && response.request().method() === 'POST',
  );
  const reread = page.waitForResponse(
    (response) => donationReadPattern.test(response.url()) && response.request().method() === 'GET',
  );
  await page.getByRole('button', { name, exact: true }).click();
  await action;
  await reread;
}

async function createDonation(page: Page, email: string) {
  await page.goto('/donate?lang=en');
  await waitForHydration(page);
  await page.getByLabel('Name').fill('Step 38 Donor');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Create trial donation' }).click();
  await expect(page).toHaveURL(/\/donate\/simulated\?donation=[0-9a-f-]+$/);
  await waitForHydration(page);
  await expect(page.getByRole('button', { name: 'Confirm simulation' })).toBeEnabled();
}

async function expectNoStoredPii(page: Page, value: string) {
  const stored = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
    documentCookie: document.cookie,
  }));
  expect(JSON.stringify(stored)).not.toContain(value);
  const cookies = await page.context().cookies();
  expect(JSON.stringify(cookies)).not.toContain(value);
}

import { expect, test } from '@playwright/test';

test('upcoming and past event filters are distinguishable and shareable', async ({ page }) => {
  await page.goto('/events?lang=en');

  await expect(page.getByRole('heading', { level: 2, name: 'Family support day' })).toBeVisible();
  await expect(page.getByText('Past family gathering')).toHaveCount(0);
  await page.getByRole('link', { name: 'Past', exact: true }).click();
  await expect(page).toHaveURL(/timeframe=past&view=list&lang=en/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Past family gathering' }),
  ).toBeVisible();
  await expect(page.getByRole('article').getByText('Past', { exact: true })).toBeVisible();
  await expect(page.getByText('Family support day')).toHaveCount(0);
});

test('calendar view groups events while remaining an agenda on mobile', async ({ page }) => {
  await page.goto('/events?lang=en&timeframe=upcoming&view=calendar');

  await expect(page.getByRole('grid', { name: 'January 2027' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: '2027-01-15' })).toContainText(
    'Family support day',
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('grid')).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Family support day' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('event dates remain fixed to Addis Ababa across browser timezones', async ({ browser }) => {
  const paths = [];
  for (const timezoneId of ['Pacific/Honolulu', 'Asia/Tokyo']) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await page.goto('/events/family-support-day?lang=en');
    paths.push(
      await page
        .getByText(/January 15, 2027/)
        .first()
        .textContent(),
    );
    await context.close();
  }
  expect(paths[0]).toBe(paths[1]);
});

test('RSVP confirms once and explains a duplicate without exposing identities', async ({
  page,
}) => {
  await page.goto('/events/family-support-day?lang=en');
  await expect(page.getByText('private-rsvp@example.org')).toHaveCount(0);

  await submitRsvp(page, 'step35-guest@example.org');
  await expect(page.getByRole('status')).toContainText('Your RSVP is confirmed');
  await submitRsvp(page, 'step35-guest@example.org');
  const duplicate = page.getByRole('region', { name: 'RSVP for this event' }).getByRole('alert');
  await expect(duplicate).toContainText('already registered');
  await expect(duplicate).toContainText('No second RSVP was created');
});

test('iCal download has a calendar filename and interoperable content', async ({ page }) => {
  await page.goto('/events/family-support-day?lang=en');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Add to calendar (.ics)' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('family-support-day.ics');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const calendar = Buffer.concat(chunks).toString('utf8');
  expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
  expect(calendar).toContain('BEGIN:VEVENT\r\n');
  expect(calendar).toContain('DTSTART:20270114T223000Z\r\n');
});

async function submitRsvp(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Name').fill('Step 35 Guest');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Number of attendees').fill('2');
  await page.getByRole('button', { name: 'Confirm RSVP' }).click();
}

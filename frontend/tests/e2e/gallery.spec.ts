import { expect, test } from '@playwright/test';

test('gallery pagination remains shareable with a large collection', async ({ page }) => {
  await page.goto('/gallery?lang=en');

  await expect(page.getByRole('article')).toHaveCount(12);
  const firstImage = page.locator('article img').first();
  await expect(firstImage).toHaveAttribute('loading', 'lazy');
  await expect(firstImage).toHaveAttribute('sizes', /100vw/);
  await expect(page.getByText('Page 1 / 2')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2&type=all&layout=grid&lang=en/);
  await expect(page.getByRole('article')).toHaveCount(5);
  await expect(page.getByText('Page 2 / 2')).toBeVisible();
});

test('video filtering retains native controls and never enables autoplay', async ({ page }) => {
  await page.goto('/gallery?lang=en');
  await page.getByRole('link', { name: 'Videos' }).click();

  await expect(page).toHaveURL(/type=video/);
  await expect(page.getByRole('article')).toHaveCount(2);
  const videos = page.locator('article video');
  await expect(videos).toHaveCount(2);
  for (const video of await videos.all()) {
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).toHaveAttribute('preload', 'metadata');
    await expect(video).not.toHaveAttribute('autoplay', /.*/);
  }
});

test('keyboard users can open, close and return from the image lightbox', async ({ page }) => {
  await page.goto('/gallery?lang=en&type=image');
  const trigger = page.getByRole('button', { name: /Open image: Community moment 1$/ });

  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close lightbox' })).toBeFocused();
  await expect(dialog.getByAltText('Community activity 1 at Nehemiah Autism Center')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('gallery uses the localized alternative text supplied by the API', async ({ page }) => {
  await page.goto('/gallery?lang=am&type=image');

  const firstImage = page.locator('article img').first();
  await expect(firstImage).toHaveAttribute('alt', 'በነህምያ ኦቲዝም ማዕከል የተካሄደ የማህበረሰብ እንቅስቃሴ 1');
  await expect(page.getByAltText(/Community activity 1/)).toHaveCount(0);
});

test('video lightbox respects reduced motion and does not start playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/gallery?lang=en&type=video');
  await page.getByRole('button', { name: 'Open video in lightbox' }).first().click();

  const video = page.getByRole('dialog').locator('video');
  await expect(video).toBeVisible();
  expect(
    await video.evaluate((element) => element instanceof HTMLVideoElement && element.paused),
  ).toBe(true);
  await expect(video).not.toHaveAttribute('autoplay', /.*/);
});

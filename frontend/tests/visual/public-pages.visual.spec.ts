import { expect, test } from '@playwright/test';

const publicScreens = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'team', path: '/team' },
  { name: 'team-detail', path: '/team/melissa-munoz' },
  { name: 'events', path: '/events' },
  { name: 'events-calendar', path: '/events?view=calendar' },
  { name: 'event-detail', path: '/events/family-support-day' },
  { name: 'blog', path: '/blog' },
  { name: 'blog-detail', path: '/blog/how-your-donations-change-lives' },
  { name: 'search', path: '/search?q=support' },
  { name: 'gallery', path: '/gallery' },
  { name: 'gallery-masonry', path: '/gallery/masonry' },
  { name: 'gallery-video', path: '/gallery?type=video' },
  { name: 'faq', path: '/faq' },
  { name: 'resources', path: '/resources' },
  { name: 'contact', path: '/contact' },
  { name: 'volunteer', path: '/volunteer' },
  { name: 'donate', path: '/donate' },
  {
    name: 'donate-checkout',
    path: '/donate/simulated?donation=00000000-0000-4000-8000-000000000901',
  },
  { name: 'coming-soon', path: '/coming-soon' },
] as const;

for (const screen of publicScreens) {
  test(`${screen.name} matches the frozen UI`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    await page.evaluate(() => document.fonts.ready);
    await revealLazyContent(page);
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });
}

async function revealLazyContent(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 400);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every(
          (image) => !image.currentSrc || (image.complete && image.naturalWidth > 0),
        ),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(500);
}

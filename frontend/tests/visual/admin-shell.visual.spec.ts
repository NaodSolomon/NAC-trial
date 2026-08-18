import { expect, test } from '@playwright/test';
import { adminWorkspaceScreens, mockAdminWorkspace } from '../helpers/admin-workspace';

test.beforeEach(async ({ context, page }) => {
  await mockAdminWorkspace(context, page);
});

test('administrator shell matches the responsive workspace baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Page views')).toBeVisible();
  await expect(page).toHaveScreenshot('admin-dashboard.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

for (const screen of adminWorkspaceScreens) {
  test(`${screen.name} matches the responsive workspace baseline`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    await expect(page.getByRole('heading', { name: screen.ready })).toBeVisible();
    if (screen.name === 'admin-analytics') {
      await expect(
        page.getByRole('heading', { name: 'Thirty-day confirmed ETB trend' }),
      ).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      timeout: 15_000,
    });
  });
}

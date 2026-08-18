import type { Page } from '@playwright/test';

export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => Object.keys(document).some((key) => key.startsWith('__reactContainer$')),
    undefined,
    { timeout: 30_000 },
  );
}

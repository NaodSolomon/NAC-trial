import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const localizedRoutes = [
  '/',
  '/about',
  '/faq',
  '/blog',
  '/blog/how-your-donations-change-lives',
  '/events',
  '/events/family-support-day',
  '/resources',
  '/search?q=support',
  '/gallery',
  '/contact',
  '/volunteer',
  '/donate',
] as const;

const routes = [
  ...localizedRoutes.flatMap((route) =>
    (['en', 'am'] as const).map((language) => appendLanguage(route, language)),
  ),
  '/coming-soon',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password?token=invalid-test-token',
] as const;

for (const route of routes) {
  test(`${route} has no moderate-or-worse Axe violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter((violation) =>
      ['moderate', 'serious', 'critical'].includes(violation.impact ?? ''),
    );
    const summary = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(' > ')),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}

function appendLanguage(route: string, language: 'en' | 'am') {
  return `${route}${route.includes('?') ? '&' : '?'}lang=${language}`;
}

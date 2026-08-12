import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/?lang=en',
  '/about?lang=en',
  '/faq?lang=en',
  '/blog?lang=en',
  '/events?lang=en',
  '/resources?lang=en',
  '/contact?lang=en',
  '/volunteer?lang=en',
  '/donate?lang=en',
  '/admin/login',
];

test('implemented public and authentication pages have no serious axe violations', async ({
  page,
}) => {
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route);
      const result = await new AxeBuilder({ page }).analyze();
      const blocking = result.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/fullstack',
  globalSetup: './tests/fullstack/global-setup.ts',
  grep: process.env.E2E_TEST_SCOPE === 'smoke' ? /@smoke/ : undefined,
  workers: 1,
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
});

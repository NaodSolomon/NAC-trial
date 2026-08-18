import { defineConfig, devices } from '@playwright/test';
import { API_ORIGIN, API_URL, APP_URL } from './tests/helpers/test-endpoints';

export default defineConfig({
  testDir: './tests',
  // Serial browser projects avoid concurrent Next.js development compilation corrupting route data.
  workers: 1,
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /e2e\/.*\.spec\.ts/,
      testIgnore: /accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'accessibility',
      testMatch: /e2e\/accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node tests/helpers/home-api-server.mjs',
      url: `${API_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev',
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      env: {
        API_URL,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_STORAGE_ORIGIN: API_ORIGIN,
        MEDIA_IMAGE_ORIGIN: API_ORIGIN,
      },
    },
  ],
});

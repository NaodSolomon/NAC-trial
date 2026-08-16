import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Serial browser projects avoid concurrent Next.js development compilation corrupting route data.
  workers: 1,
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: 'http://localhost:3000',
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
      url: 'http://127.0.0.1:4010/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      env: {
        API_URL: 'http://127.0.0.1:4010/api/v1',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4010/api/v1',
        NEXT_PUBLIC_STORAGE_ORIGIN: 'http://127.0.0.1:4010',
        MEDIA_IMAGE_ORIGIN: 'http://127.0.0.1:4010',
      },
    },
  ],
});

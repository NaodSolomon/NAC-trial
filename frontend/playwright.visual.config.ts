import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:4010/api/v1';
const storageOrigin = 'http://127.0.0.1:4010';

export default defineConfig({
  testDir: './tests/visual',
  workers: 1,
  timeout: 60_000,
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'visual-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'visual-mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: 'node tests/helpers/home-api-server.mjs',
      url: 'http://127.0.0.1:4010/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3000',
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        API_URL: apiUrl,
        NEXT_PUBLIC_API_URL: apiUrl,
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
        NEXT_PUBLIC_STORAGE_ORIGIN: storageOrigin,
        MEDIA_IMAGE_ORIGIN: storageOrigin,
      },
    },
  ],
});

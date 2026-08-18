import { defineConfig, devices } from '@playwright/test';
import { API_ORIGIN, API_URL, APP_URL } from './tests/helpers/test-endpoints';

export default defineConfig({
  testDir: './tests/visual',
  workers: 1,
  timeout: 60_000,
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: APP_URL,
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
      url: `${API_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm build && pnpm start',
      url: APP_URL,
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        API_URL,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_SITE_URL: APP_URL,
        NEXT_PUBLIC_STORAGE_ORIGIN: API_ORIGIN,
        MEDIA_IMAGE_ORIGIN: API_ORIGIN,
      },
    },
  ],
});

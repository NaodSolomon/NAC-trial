import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const e2ePassword = 'E2eStrongPassword123!';
export const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8100/api/v1';
export const mailpitUrl = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8027';

export async function login(page: Page, email: string, password = e2ePassword) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin$/, { timeout: 60_000, waitUntil: 'domcontentloaded' });
}

export async function backendLogin(
  request: APIRequestContext,
  email: string,
  password = e2ePassword,
  userAgent = 'NAC full-stack maintenance client',
) {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
    headers: { 'user-agent': userAgent },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as {
    data: {
      accessToken: string;
      refreshToken: string;
      admin: { id: string; name: string; email: string; role: string };
    };
  };
  return body.data;
}

export async function createCmsDraft(page: Page, title: string, slug: string, content: string) {
  await page.goto('/admin/content/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Page content').fill(content);
  await page.getByRole('button', { name: 'Create draft' }).click();
  await page.waitForURL(/\/admin\/content\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
}

export function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 19);
}

export async function waitForLatestMail(
  request: APIRequestContext,
  expected: RegExp,
  timeoutMs = 15_000,
) {
  let message = '';
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/view/latest.txt`);
        if (response.ok()) message = await response.text();
        return expected.test(message);
      },
      { timeout: timeoutMs, intervals: [250, 500, 1_000] },
    )
    .toBe(true);
  return message;
}

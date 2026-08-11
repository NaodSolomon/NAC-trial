import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const currentAdminId = '00000000-0000-4000-8000-000000004500';
const secondAdminId = '00000000-0000-4000-8000-000000004501';
const createdAdminId = '00000000-0000-4000-8000-000000004502';
const sessionId = '00000000-0000-4000-8000-000000004503';
const auditId = '00000000-0000-4000-8000-000000004504';
const now = '2026-08-12T09:00:00.000Z';

test('manages administrators while preserving the final super administrator', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'SUPER_ADMIN');
  let admins = [administrator(currentAdminId, 'Root Administrator', 'SUPER_ADMIN', true)];
  await page.route('**/api/v1/admin/users?**', (route) => respond(route, paged(admins)));
  await page.route('**/api/v1/admin/users', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const created = administrator(
      createdAdminId,
      String(body.name),
      String(body.role),
      true,
      String(body.email),
    );
    admins.push(created);
    return respond(route, created, 201);
  });
  await page.route('**/api/v1/admin/users/**', (route) => {
    const id = route.request().url().split('/').at(-1)!;
    if (route.request().method() === 'DELETE') {
      admins = admins.filter((admin) => admin.id !== id);
      return respond(route, { message: 'Administrator deleted successfully' });
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    if (id === currentAdminId && body.isActive === false)
      return reject(
        route,
        409,
        'The final active super administrator cannot be demoted or deactivated',
      );
    const index = admins.findIndex((admin) => admin.id === id);
    admins[index] = { ...admins[index], ...body, updatedAt: now };
    return respond(route, admins[index]);
  });

  await page.goto('/admin/users');
  await page.getByRole('button', { name: /Root Administrator/ }).click();
  const updateCard = page.getByRole('heading', { name: 'Update administrator' }).locator('..');
  await updateCard.getByLabel('Account active').uncheck();
  await updateCard.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('The final active super administrator cannot be demoted or deactivated'),
  ).toBeVisible();

  const createCard = page.getByRole('heading', { name: 'Create administrator' }).locator('..');
  await createCard.getByLabel('Name').fill('Finance Assistant');
  await createCard.getByLabel('Email').fill('finance@example.org');
  await createCard.getByLabel('Temporary password').fill('StrongPassword123');
  await createCard.getByLabel('Role').selectOption('FINANCE_VIEWER');
  await createCard.getByRole('button', { name: 'Create administrator' }).click();
  await expect(page.getByText('Administrator created')).toBeVisible();
  await page.getByRole('button', { name: /Finance Assistant/ }).click();
  const createdCard = page.getByRole('heading', { name: 'Update administrator' }).locator('..');
  await createdCard.getByLabel('Account active').uncheck();
  await createdCard.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Administrator updated')).toBeVisible();
  await createdCard.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete administrator' }).click();
  await expect(page.getByText('Administrator deleted')).toBeVisible();
  await expect(page.getByRole('button', { name: /Finance Assistant/ })).toHaveCount(0);
});

test('filters immutable audit history without rendering arbitrary metadata', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'SUPER_ADMIN');
  let requested = '';
  await page.route('**/api/v1/admin/audit-logs?**', (route) => {
    requested = route.request().url();
    return respond(
      route,
      paged([
        {
          id: auditId,
          adminId: currentAdminId,
          action: 'REINDEX',
          entityType: 'SEARCH',
          entityId: null,
          metadata: {
            indexes: ['cms_pages_title_trgm_idx'],
            durationMs: 125,
            password: 'NeverRenderMe',
            refreshToken: 'NeverRenderToken',
            unsafeHtml: '<img src=x onerror=alert(1)>',
          },
          createdAt: now,
        },
      ]),
    );
  });
  await page.goto('/admin/audit-logs');
  await expect(page.getByText('cms_pages_title_trgm_idx')).toBeVisible();
  await expect(page.getByText('NeverRenderMe')).toHaveCount(0);
  await expect(page.getByText('NeverRenderToken')).toHaveCount(0);
  await expect(page.getByText(/onerror=alert/)).toHaveCount(0);
  await page.getByLabel('Action').fill('REINDEX');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect.poll(() => requested).toContain('action=REINDEX');
});

test('revoking the current session causes the next rejected request to return to login', async ({
  context,
  page,
}) => {
  let revoked = false;
  await authenticate(context, page, 'SUPER_ADMIN', () => revoked);
  await page.route('**/api/v1/admin/system/sessions?**', (route) =>
    revoked
      ? reject(route, 401, 'Session revoked')
      : respond(route, paged([session(currentAdminId)])),
  );
  await page.route('**/api/v1/admin/system/sessions/revoke', (route) => {
    revoked = true;
    return respond(route, { message: 'Session revoked successfully', revokedCount: 1 });
  });
  await page.goto('/admin/sessions');
  await expect(page.getByText('safe-fingerprint')).toBeVisible();
  await expect(page.getByText('REFRESH-HASH-SECRET')).toHaveCount(0);
  await expect(page.getByText('192.0.2.10')).toHaveCount(0);
  await page.getByRole('button', { name: 'Revoke device' }).click();
  await page.getByRole('button', { name: 'Revoke session' }).click();
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
});

test('revokes every session for another administrator with one confirmed action', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'SUPER_ADMIN');
  let sessions = [session(secondAdminId)];
  let target: unknown;
  await page.route('**/api/v1/admin/system/sessions?**', (route) =>
    respond(route, paged(sessions)),
  );
  await page.route('**/api/v1/admin/system/sessions/revoke', (route) => {
    target = route.request().postDataJSON();
    sessions = [];
    return respond(route, {
      message: 'Administrator sessions revoked successfully',
      revokedCount: 2,
    });
  });
  await page.goto('/admin/sessions');
  await page.getByRole('button', { name: 'Revoke all' }).click();
  await page.getByRole('button', { name: 'Revoke all sessions' }).click();
  await expect.poll(() => target).toEqual({ adminId: secondAdminId });
  await expect(page.getByText('2 sessions revoked.')).toBeVisible();
  await expect(page.getByText('No sessions match these filters.')).toBeVisible();
});

test('distinguishes readiness from Redis degradation and serializes maintenance actions', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'SUPER_ADMIN');
  let databaseAvailable = true;
  let reindexCalls = 0;
  await page.route('**/api/v1/system/health/live', (route) =>
    respond(route, { status: 'ok', process: 'alive', mode: 'trial', timestamp: now }),
  );
  await page.route('**/api/v1/system/health/ready', (route) =>
    respond(
      route,
      databaseAvailable
        ? {
            status: 'degraded',
            checks: { postgresql: 'connected', redis: 'unavailable' },
            database: 'connected',
            redis: 'unavailable',
            mode: 'trial',
            timestamp: now,
          }
        : {
            status: 'unavailable',
            checks: { postgresql: 'unavailable', redis: 'connected' },
            database: 'unavailable',
            redis: 'connected',
            mode: 'trial',
            timestamp: now,
          },
      databaseAvailable ? 200 : 503,
    ),
  );
  await page.route('**/api/v1/system/version', (route) =>
    respond(route, {
      name: 'NAC API',
      version: '0.1.0',
      environment: 'test',
      mode: 'trial',
      adapters: { storage: 'minio', mail: 'mailpit', payment: 'fake', cache: 'redis' },
      realPaymentsEnabled: false,
    }),
  );
  await page.route('**/api/v1/admin/cache/clear', (route) =>
    respond(route, { cleared: true }, 201),
  );
  await page.route('**/api/v1/admin/cache/warm', (route) =>
    respond(route, { warmed: ['settings:public', 'navigation:en'] }, 201),
  );
  await page.route('**/api/v1/admin/system/search/reindex', async (route) => {
    reindexCalls += 1;
    if (reindexCalls > 1) return reject(route, 409, 'A search index rebuild is already running');
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    return respond(route, {
      reindexed: true,
      indexes: ['cms_pages_title_trgm_idx'],
      completedAt: now,
    });
  });
  await page.goto('/admin/system');
  await expect(
    page.getByRole('heading', { name: 'PostgreSQL readiness' }).locator('..'),
  ).toContainText('Connected');
  await expect(page.getByRole('heading', { name: 'Redis cache' }).locator('..')).toContainText(
    'Degraded',
  );
  databaseAvailable = false;
  await page.getByRole('button', { name: 'Refresh health' }).click();
  await expect(
    page.getByRole('heading', { name: 'PostgreSQL readiness' }).locator('..'),
  ).toContainText('Unavailable');
  await expect(page.getByText(/traffic should receive HTTP 503/)).toBeVisible();

  await page.getByRole('button', { name: 'Warm cache' }).click();
  await page.getByRole('button', { name: 'Warm cache', exact: true }).last().click();
  await expect(page.getByText('Application cache warmed')).toBeVisible();
  await page.getByRole('button', { name: 'Reindex search' }).click();
  await page.getByRole('button', { name: 'Start rebuild' }).click();
  await expect(
    page.getByText('Rebuilding seven allowlisted PostgreSQL search indexes…'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Working…' })).toBeDisabled();
  await expect(page.getByText('Search indexes rebuilt')).toBeVisible();
  expect(reindexCalls).toBe(1);
  await page.getByRole('button', { name: 'Reindex search' }).click();
  await page.getByRole('button', { name: 'Start rebuild' }).click();
  await expect(page.getByText('Another search-index rebuild is already running.')).toBeVisible();
  expect(reindexCalls).toBe(2);
});

test('non-super-administrators cannot enter security or operations screens', async ({
  context,
  page,
}) => {
  await authenticate(context, page, 'CONTENT_EDITOR');
  for (const path of ['/admin/users', '/admin/audit-logs', '/admin/sessions', '/admin/system']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/forbidden$/);
  }
});

async function authenticate(
  context: BrowserContext,
  page: Page,
  role: 'SUPER_ADMIN' | 'CONTENT_EDITOR',
  revoked = () => false,
) {
  const admin = { id: currentAdminId, email: 'root@example.org', name: 'Root Administrator', role };
  await context.addCookies([
    {
      name: 'nac-admin-refresh',
      value: `step-45-${role}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('**/api/auth/refresh', (route) =>
    revoked()
      ? reject(route, 401, 'Session revoked')
      : respond(route, { accessToken: 'step-45-access', expiresIn: 900, admin }),
  );
  await page.route('**/api/v1/auth/me', (route) => respond(route, admin));
}
function respond(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, statusCode: status, timestamp: now }),
  });
}
function reject(route: Route, status: number, message: string) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      statusCode: status,
      message,
      error: 'Error',
      timestamp: now,
    }),
  });
}
function paged(data: unknown[]) {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 20, totalPages: data.length ? 1 : 0 },
  };
}
function administrator(
  id: string,
  name: string,
  role: string,
  isActive: boolean,
  email = 'root@example.org',
) {
  return {
    id,
    name,
    email,
    role,
    isActive,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    passwordHash: 'NEVER_RENDER',
  };
}
function session(adminId: string) {
  return {
    id: sessionId,
    admin: {
      id: adminId,
      name: adminId === currentAdminId ? 'Root Administrator' : 'Second Administrator',
      email: adminId === currentAdminId ? 'root@example.org' : 'second@example.org',
    },
    userAgent: 'Accessible Browser',
    ipFingerprint: 'safe-fingerprint',
    createdAt: now,
    lastUsedAt: now,
    expiresAt: '2026-08-13T09:00:00.000Z',
    status: 'ACTIVE',
    refreshTokenHash: 'REFRESH-HASH-SECRET',
    rawIpAddress: '192.0.2.10',
    tokenFamilyId: 'TOKEN-FAMILY-SECRET',
  };
}

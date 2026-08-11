import { browserApiClient } from '@/lib/api/browser-client';
import { ApiRequestError } from '@/lib/api/errors';
import { API_URL } from '@/lib/constants';
import {
  adminSessionListSchema,
  administratorListSchema,
  administratorSchema,
  auditLogListSchema,
  cacheClearSchema,
  cacheWarmSchema,
  livenessSchema,
  readinessSchema,
  revokeSessionSchema,
  searchReindexSchema,
  versionSchema,
  type AdministratorEditor,
  type AdministratorUpdate,
} from './system.schemas';

interface PageCriteria {
  page: number;
  signal?: AbortSignal;
}
function pageQuery(criteria: PageCriteria, limit = 10) {
  return new URLSearchParams({
    page: String(criteria.page),
    limit: String(limit),
    sortOrder: 'desc',
  });
}

export async function listAdministrators(
  criteria: PageCriteria & { role?: string; isActive?: string },
) {
  const query = pageQuery(criteria);
  if (criteria.role) query.set('role', criteria.role);
  if (criteria.isActive) query.set('isActive', criteria.isActive);
  return administratorListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/users?${query}`, { signal: criteria.signal }),
  );
}
export async function createAdministrator(values: AdministratorEditor) {
  return administratorSchema.parse(await browserApiClient.post<unknown>('/admin/users', values));
}
export async function updateAdministrator(id: string, values: AdministratorUpdate) {
  return administratorSchema.parse(
    await browserApiClient.patch<unknown>(`/admin/users/${encodeURIComponent(id)}`, {
      name: values.name,
      role: values.role,
      isActive: values.isActive,
      ...(values.password && { password: values.password }),
    }),
  );
}
export function deleteAdministrator(id: string) {
  return browserApiClient.delete<{ message: string }>(`/admin/users/${encodeURIComponent(id)}`);
}

export async function listAuditLogs(
  criteria: PageCriteria & {
    adminId?: string;
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
  },
) {
  const query = pageQuery(criteria, 20);
  if (criteria.adminId) query.set('adminId', criteria.adminId);
  if (criteria.entityType) query.set('entityType', criteria.entityType);
  if (criteria.action) query.set('action', criteria.action);
  if (criteria.from) query.set('from', criteria.from);
  if (criteria.to) query.set('to', criteria.to);
  return auditLogListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/audit-logs?${query}`, { signal: criteria.signal }),
  );
}

export async function listAdminSessions(
  criteria: PageCriteria & { adminId?: string; status?: string },
) {
  const query = pageQuery(criteria, 20);
  if (criteria.adminId) query.set('adminId', criteria.adminId);
  if (criteria.status) query.set('status', criteria.status);
  return adminSessionListSchema.parse(
    await browserApiClient.get<unknown>(`/admin/system/sessions?${query}`, {
      signal: criteria.signal,
    }),
  );
}
export async function revokeSession(target: { sessionId: string } | { adminId: string }) {
  return revokeSessionSchema.parse(
    await browserApiClient.post<unknown>('/admin/system/sessions/revoke', target),
  );
}

export async function clearCache() {
  return cacheClearSchema.parse(await browserApiClient.post<unknown>('/admin/cache/clear'));
}
export async function warmCache() {
  return cacheWarmSchema.parse(await browserApiClient.post<unknown>('/admin/cache/warm'));
}
export async function reindexSearch() {
  return searchReindexSchema.parse(
    await browserApiClient.post<unknown>('/admin/system/search/reindex', undefined, {
      timeoutMs: 120_000,
    }),
  );
}

export async function getSystemStatus(signal?: AbortSignal) {
  const [live, ready, version] = await Promise.all([
    getHealthValue('/system/health/live', livenessSchema, signal),
    getHealthValue('/system/health/ready', readinessSchema, signal),
    getHealthValue('/system/version', versionSchema, signal),
  ]);
  return { live, ready, version };
}

async function getHealthValue<T>(
  path: string,
  schema: { parse(value: unknown): T },
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
      headers: { accept: 'application/json' },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8_000)])
        : AbortSignal.timeout(8_000),
    });
  } catch (cause) {
    throw new ApiRequestError({
      kind: 'NETWORK',
      status: 0,
      message: 'System health could not be reached.',
      cause,
    });
  }
  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== 'object' || !('data' in payload))
    throw new ApiRequestError({
      kind: 'CONTRACT',
      status: response.status,
      message: 'System health returned an unexpected response.',
    });
  return schema.parse((payload as { data: unknown }).data);
}

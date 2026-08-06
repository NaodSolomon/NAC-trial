export const refreshCookieName = 'nac-admin-refresh';
export const legacyAuthStorageKey = 'auth-storage';

export const adminRoles = ['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER'] as const;
export type AdminRole = (typeof adminRoles)[number];

export interface AdminPrincipal {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface BrowserAuthSession {
  accessToken: string;
  expiresIn: number;
  admin: AdminPrincipal;
}

export function isAdminPrincipal(value: unknown): value is AdminPrincipal {
  if (!value || typeof value !== 'object') return false;
  const admin = value as Record<string, unknown>;
  return (
    typeof admin.id === 'string' &&
    typeof admin.email === 'string' &&
    typeof admin.name === 'string' &&
    adminRoles.some((role) => role === admin.role)
  );
}

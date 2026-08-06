import type { AdminRole } from './constants';

const protectedRouteRoles: Array<{ prefix: string; roles: AdminRole[] }> = [
  { prefix: '/admin/system', roles: ['SUPER_ADMIN'] },
  { prefix: '/admin/administrators', roles: ['SUPER_ADMIN'] },
  { prefix: '/admin/audit-logs', roles: ['SUPER_ADMIN'] },
  { prefix: '/admin/donations', roles: ['SUPER_ADMIN', 'FINANCE_VIEWER'] },
  {
    prefix: '/admin/content',
    roles: ['SUPER_ADMIN', 'CONTENT_EDITOR'],
  },
  { prefix: '/admin/blog', roles: ['SUPER_ADMIN', 'CONTENT_EDITOR'] },
  { prefix: '/admin/events', roles: ['SUPER_ADMIN', 'CONTENT_EDITOR'] },
  { prefix: '/admin/gallery', roles: ['SUPER_ADMIN', 'CONTENT_EDITOR'] },
  { prefix: '/admin/seo', roles: ['SUPER_ADMIN', 'CONTENT_EDITOR'] },
];

export function rolesForAdminPath(pathname: string): AdminRole[] {
  return (
    protectedRouteRoles.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.roles ?? ['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']
  );
}

export function canAccessAdminPath(role: AdminRole, pathname: string): boolean {
  return rolesForAdminPath(pathname).includes(role);
}

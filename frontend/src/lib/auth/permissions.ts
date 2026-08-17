import type { AdminRole } from './constants';

export type AdminPermission =
  | 'dashboard:view'
  | 'content:manage'
  | 'engagement:manage'
  | 'newsletter:manage'
  | 'donations:view'
  | 'analytics:view'
  | 'administrators:manage'
  | 'audit:view'
  | 'system:manage';

export type AdminNavigationIcon =
  | 'dashboard'
  | 'content'
  | 'blog'
  | 'events'
  | 'gallery'
  | 'media'
  | 'resources'
  | 'seo'
  | 'navigation'
  | 'contact'
  | 'volunteers'
  | 'testimonials'
  | 'newsletter'
  | 'donations'
  | 'analytics'
  | 'administrators'
  | 'sessions'
  | 'audit'
  | 'system'
  | 'settings';

export interface AdminNavigationItem {
  label: string;
  href: string;
  icon: AdminNavigationIcon;
  permission: AdminPermission;
  description: string;
}

const rolePermissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set([
    'dashboard:view',
    'content:manage',
    'engagement:manage',
    'newsletter:manage',
    'donations:view',
    'analytics:view',
    'administrators:manage',
    'audit:view',
    'system:manage',
  ]),
  CONTENT_EDITOR: new Set(['dashboard:view', 'content:manage', 'engagement:manage']),
  FINANCE_VIEWER: new Set(['dashboard:view', 'donations:view']),
};

export const adminNavigation: readonly AdminNavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: 'dashboard',
    permission: 'dashboard:view',
    description: 'Role-appropriate operational summary',
  },
  {
    label: 'CMS pages',
    href: '/admin/content',
    icon: 'content',
    permission: 'content:manage',
    description: 'Published and draft website content',
  },
  {
    label: 'Blog',
    href: '/admin/blog',
    icon: 'blog',
    permission: 'content:manage',
    description: 'Articles and publishing',
  },
  {
    label: 'FAQ',
    href: '/admin/faq',
    icon: 'content',
    permission: 'content:manage',
    description: 'Published questions and answers',
  },
  {
    label: 'Events',
    href: '/admin/events',
    icon: 'events',
    permission: 'content:manage',
    description: 'Events and RSVP administration',
  },
  {
    label: 'Gallery',
    href: '/admin/gallery',
    icon: 'gallery',
    permission: 'content:manage',
    description: 'Gallery and media presentation',
  },
  {
    label: 'Media',
    href: '/admin/media',
    icon: 'media',
    permission: 'content:manage',
    description: 'Validated image, video and document uploads',
  },
  {
    label: 'Resources',
    href: '/admin/resources',
    icon: 'resources',
    permission: 'content:manage',
    description: 'Published public download library',
  },
  {
    label: 'SEO',
    href: '/admin/seo',
    icon: 'seo',
    permission: 'content:manage',
    description: 'Localized search and social metadata',
  },
  {
    label: 'Navigation',
    href: '/admin/navigation',
    icon: 'navigation',
    permission: 'content:manage',
    description: 'Localized public navigation and visibility',
  },
  {
    label: 'Contact',
    href: '/admin/contact',
    icon: 'contact',
    permission: 'engagement:manage',
    description: 'Private contact form submissions',
  },
  {
    label: 'Volunteers',
    href: '/admin/volunteers',
    icon: 'volunteers',
    permission: 'engagement:manage',
    description: 'Volunteer application review',
  },
  {
    label: 'Testimonials',
    href: '/admin/testimonials',
    icon: 'testimonials',
    permission: 'engagement:manage',
    description: 'Localized testimonial moderation',
  },
  {
    label: 'Newsletter',
    href: '/admin/newsletter',
    icon: 'newsletter',
    permission: 'newsletter:manage',
    description: 'Private subscriber management',
  },
  {
    label: 'Donations',
    href: '/admin/donations',
    icon: 'donations',
    permission: 'donations:view',
    description: 'Donation records and receipts',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: 'analytics',
    permission: 'analytics:view',
    description: 'Privacy-conscious website activity',
  },
  {
    label: 'Administrators',
    href: '/admin/users',
    icon: 'administrators',
    permission: 'administrators:manage',
    description: 'Accounts, roles and sessions',
  },
  {
    label: 'Sessions',
    href: '/admin/sessions',
    icon: 'sessions',
    permission: 'administrators:manage',
    description: 'Active devices and session revocation',
  },
  {
    label: 'Audit logs',
    href: '/admin/audit-logs',
    icon: 'audit',
    permission: 'audit:view',
    description: 'Immutable administrative activity',
  },
  {
    label: 'System',
    href: '/admin/system',
    icon: 'system',
    permission: 'system:manage',
    description: 'Cache, health and search maintenance',
  },
  {
    label: 'Public settings',
    href: '/admin/settings',
    icon: 'settings',
    permission: 'system:manage',
    description: 'Global language, contact and social settings',
  },
] as const;

const protectedRoutePermissions: Array<{ prefix: string; permission: AdminPermission }> = [
  { prefix: '/admin/system', permission: 'system:manage' },
  { prefix: '/admin/settings', permission: 'system:manage' },
  { prefix: '/admin/administrators', permission: 'administrators:manage' },
  { prefix: '/admin/users', permission: 'administrators:manage' },
  { prefix: '/admin/sessions', permission: 'administrators:manage' },
  { prefix: '/admin/audit-logs', permission: 'audit:view' },
  { prefix: '/admin/analytics', permission: 'analytics:view' },
  { prefix: '/admin/donations', permission: 'donations:view' },
  { prefix: '/admin/content', permission: 'content:manage' },
  { prefix: '/admin/blog', permission: 'content:manage' },
  { prefix: '/admin/events', permission: 'content:manage' },
  { prefix: '/admin/gallery', permission: 'content:manage' },
  { prefix: '/admin/media', permission: 'content:manage' },
  { prefix: '/admin/resources', permission: 'content:manage' },
  { prefix: '/admin/navigation', permission: 'content:manage' },
  { prefix: '/admin/seo', permission: 'content:manage' },
  { prefix: '/admin/contact', permission: 'engagement:manage' },
  { prefix: '/admin/volunteers', permission: 'engagement:manage' },
  { prefix: '/admin/testimonials', permission: 'engagement:manage' },
  { prefix: '/admin/newsletter', permission: 'newsletter:manage' },
];

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return rolePermissions[role].has(permission);
}

export function navigationForRole(role: AdminRole): AdminNavigationItem[] {
  return adminNavigation.filter((item) => hasAdminPermission(role, item.permission));
}

export function permissionForAdminPath(pathname: string): AdminPermission {
  return (
    protectedRoutePermissions.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.permission ?? 'dashboard:view'
  );
}

export function rolesForAdminPath(pathname: string): AdminRole[] {
  const permission = permissionForAdminPath(pathname);
  return (Object.keys(rolePermissions) as AdminRole[]).filter((role) =>
    hasAdminPermission(role, permission),
  );
}

export function canAccessAdminPath(role: AdminRole, pathname: string): boolean {
  return hasAdminPermission(role, permissionForAdminPath(pathname));
}

export function formatAdminRole(role: AdminRole): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

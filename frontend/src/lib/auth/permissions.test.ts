import { describe, expect, it } from 'vitest';
import { canAccessAdminPath, hasAdminPermission, navigationForRole } from './permissions';

describe('administrator permissions', () => {
  it('shows super administrators every administration destination', () => {
    const links = navigationForRole('SUPER_ADMIN').map(({ href }) => href);
    expect(links).toContain('/admin/administrators');
    expect(links).toContain('/admin/audit-logs');
    expect(links).toContain('/admin/donations');
    expect(links).toContain('/admin/content');
    expect(links).toContain('/admin/system');
  });

  it('limits content editors to content and engagement destinations', () => {
    const links = navigationForRole('CONTENT_EDITOR').map(({ href }) => href);
    expect(links).toContain('/admin/content');
    expect(links).toContain('/admin/engagement');
    expect(links).not.toContain('/admin/donations');
    expect(links).not.toContain('/admin/system');
    expect(canAccessAdminPath('CONTENT_EDITOR', '/admin/events/example')).toBe(true);
  });

  it('limits finance viewers to dashboard and donation data', () => {
    expect(navigationForRole('FINANCE_VIEWER').map(({ href }) => href)).toEqual([
      '/admin',
      '/admin/donations',
    ]);
    expect(hasAdminPermission('FINANCE_VIEWER', 'donations:view')).toBe(true);
    expect(canAccessAdminPath('FINANCE_VIEWER', '/admin/analytics')).toBe(false);
  });
});

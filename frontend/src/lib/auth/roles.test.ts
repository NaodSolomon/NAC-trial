import { describe, expect, it } from 'vitest';
import { canAccessAdminPath } from './roles';

describe('administrator route roles', () => {
  it('restricts system administration to super administrators', () => {
    expect(canAccessAdminPath('SUPER_ADMIN', '/admin/system')).toBe(true);
    expect(canAccessAdminPath('CONTENT_EDITOR', '/admin/system')).toBe(false);
    expect(canAccessAdminPath('FINANCE_VIEWER', '/admin/system')).toBe(false);
  });

  it('allows only relevant roles into content and finance sections', () => {
    expect(canAccessAdminPath('CONTENT_EDITOR', '/admin/blog/posts')).toBe(true);
    expect(canAccessAdminPath('FINANCE_VIEWER', '/admin/blog/posts')).toBe(false);
    expect(canAccessAdminPath('FINANCE_VIEWER', '/admin/donations')).toBe(true);
  });
});

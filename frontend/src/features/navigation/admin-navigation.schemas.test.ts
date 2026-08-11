import { describe, expect, it } from 'vitest';
import { navigationEditorSchema } from './admin-navigation.schemas';

describe('navigationEditorSchema', () => {
  it('accepts internal paths and HTTPS destinations', () => {
    expect(navigationEditorSchema.safeParse({ label: 'About', url: '/about' }).success).toBe(true);
    expect(
      navigationEditorSchema.safeParse({ label: 'Partner', url: 'https://example.org' }).success,
    ).toBe(true);
  });

  it('rejects protocol-relative and insecure external destinations', () => {
    expect(
      navigationEditorSchema.safeParse({ label: 'Unsafe', url: '//example.org' }).success,
    ).toBe(false);
    expect(
      navigationEditorSchema.safeParse({ label: 'Unsafe', url: 'http://example.org' }).success,
    ).toBe(false);
  });
});

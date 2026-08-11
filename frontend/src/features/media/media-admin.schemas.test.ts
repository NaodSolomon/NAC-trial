import { describe, expect, it } from 'vitest';
import { validateMediaFile } from './media-admin.schemas';

describe('validateMediaFile', () => {
  it('accepts supported files within the configured size', () => {
    expect(
      validateMediaFile(new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' })),
    ).toBeNull();
  });
  it('rejects unsupported and oversized files before upload', () => {
    expect(validateMediaFile(new File(['text'], 'unsafe.svg', { type: 'image/svg+xml' }))).toMatch(
      /Allowed files/,
    );
    const oversized = new File([new Uint8Array(10_485_761)], 'large.pdf', {
      type: 'application/pdf',
    });
    expect(validateMediaFile(oversized)).toMatch(/10 MB/);
  });
});

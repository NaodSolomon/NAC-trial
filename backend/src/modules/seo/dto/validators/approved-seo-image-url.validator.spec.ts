import { ApprovedSeoImageUrlConstraint } from './approved-seo-image-url.validator';

describe('ApprovedSeoImageUrlConstraint', () => {
  const constraint = new ApprovedSeoImageUrlConstraint();
  const trackedKeys = ['STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_PUBLIC_URL'];
  const original = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of trackedKeys) {
      original.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    original.clear();
  });

  it('treats an explicit null as a cleared image', () => {
    expect(constraint.validate(null)).toBe(true);
  });

  it.each([undefined, 42, {}, [], true])('rejects the non-string value %p', (value) => {
    expect(constraint.validate(value)).toBe(false);
  });

  it('rejects a value that is not a URL at all', () => {
    expect(constraint.validate('not a url')).toBe(false);
  });

  it('accepts any HTTPS URL', () => {
    expect(constraint.validate('https://cdn.example.org/banner.png')).toBe(true);
  });

  it.each([
    'https://user@cdn.example.org/banner.png',
    'https://user:secret@cdn.example.org/banner.png',
  ])('rejects credentials embedded in %s', (value) => {
    expect(constraint.validate(value)).toBe(false);
  });

  it.each(['ftp://cdn.example.org/banner.png', 'data:image/png;base64,AAAA'])(
    'rejects the unsupported scheme in %s',
    (value) => {
      expect(constraint.validate(value)).toBe(false);
    },
  );

  it('accepts the default local MinIO public URL', () => {
    expect(constraint.validate('http://localhost:9000/nehemiah-media/logo.png')).toBe(true);
  });

  it('accepts the bucket path derived from the endpoint', () => {
    process.env.STORAGE_ENDPOINT = 'http://minio:9000/';
    process.env.STORAGE_BUCKET = 'media';
    process.env.STORAGE_PUBLIC_URL = 'http://minio:9000/media';

    expect(constraint.validate('http://minio:9000/media/logo.png')).toBe(true);
  });

  it('accepts the base path itself without a trailing segment', () => {
    expect(constraint.validate('http://localhost:9000/nehemiah-media')).toBe(true);
  });

  it('rejects an HTTP URL on a different origin', () => {
    expect(constraint.validate('http://evil.example.org/nehemiah-media/logo.png')).toBe(false);
  });

  it('rejects an HTTP URL outside the approved bucket path', () => {
    expect(constraint.validate('http://localhost:9000/other-bucket/logo.png')).toBe(false);
  });

  it('rejects a path that merely shares the bucket prefix', () => {
    expect(constraint.validate('http://localhost:9000/nehemiah-media-private/logo.png')).toBe(false);
  });

  it('ignores a non-local HTTP storage origin', () => {
    process.env.STORAGE_ENDPOINT = 'http://storage.example.org';
    process.env.STORAGE_BUCKET = 'media';
    process.env.STORAGE_PUBLIC_URL = 'http://storage.example.org/media';

    expect(constraint.validate('http://storage.example.org/media/logo.png')).toBe(false);
  });

  it('explains the requirement', () => {
    expect(constraint.defaultMessage()).toContain('HTTPS');
  });
});

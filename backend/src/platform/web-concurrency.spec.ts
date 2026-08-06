import { resolveWebConcurrency } from './web-concurrency';

describe('resolveWebConcurrency', () => {
  it('defaults to one API worker', () => {
    expect(resolveWebConcurrency(undefined)).toBe(1);
  });

  it('accepts a bounded worker count', () => {
    expect(resolveWebConcurrency('2')).toBe(2);
    expect(resolveWebConcurrency('16')).toBe(16);
  });

  it.each(['0', '17', '1.5', 'invalid'])('rejects invalid worker count %s', (value) => {
    expect(() => resolveWebConcurrency(value)).toThrow('WEB_CONCURRENCY must be between 1 and 16');
  });
});

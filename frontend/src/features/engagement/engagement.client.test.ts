import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api/errors';
import { publicFormError } from './engagement.client';

describe('public engagement error messages', () => {
  it('explains rate limiting without mentioning account membership', () => {
    const message = publicFormError(
      new ApiRequestError({ kind: 'RATE_LIMITED', status: 429, message: 'rate limited' }),
      'en',
    );
    expect(message).toContain('wait a moment');
    expect(message).not.toMatch(/account|registered|member/i);
  });

  it('makes availability failures explicit without claiming submission', () => {
    const message = publicFormError(
      new ApiRequestError({ kind: 'UNAVAILABLE', status: 503, message: 'unavailable' }),
      'en',
    );
    expect(message).toContain('was not submitted');
  });
});

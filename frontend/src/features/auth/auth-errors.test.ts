import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@/lib/api/errors';
import { authenticationErrorMessage, recoveryErrorMessage } from './auth-errors';

describe('authentication error messages', () => {
  it('distinguishes account lockout from generic request throttling', () => {
    expect(
      authenticationErrorMessage(
        new ApiRequestError({
          kind: 'RATE_LIMITED',
          status: 429,
          message: 'Too many requests.',
          details: ['Too many login attempts. Try again later.'],
        }),
      ),
    ).toContain('account is temporarily locked');
    expect(
      authenticationErrorMessage(
        new ApiRequestError({
          kind: 'RATE_LIMITED',
          status: 429,
          message: 'Too many requests.',
        }),
      ),
    ).toContain('Too many attempts');
  });

  it('uses a generic invalid reset-link message', () => {
    expect(
      recoveryErrorMessage(
        new ApiRequestError({
          kind: 'VALIDATION',
          status: 400,
          message: 'Invalid request.',
        }),
      ),
    ).not.toContain('account');
  });
});

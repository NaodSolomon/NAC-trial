import { describe, expect, it } from 'vitest';
import { ApiRequestError, apiErrorFromResponse, getApiErrorMessage } from './errors';

describe('apiErrorFromResponse', () => {
  it.each([
    [400, 'VALIDATION'],
    [401, 'AUTHENTICATION'],
    [403, 'AUTHORIZATION'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
    [503, 'UNAVAILABLE'],
  ] as const)('maps HTTP %s to %s', (status, kind) => {
    expect(
      apiErrorFromResponse(status, { success: false, statusCode: status, message: 'Internal' }),
    ).toMatchObject({ status, kind });
  });

  it('retains validation details without exposing them as the primary user message', () => {
    const error = apiErrorFromResponse(400, {
      success: false,
      statusCode: 400,
      message: ['email must be an email', 'name should not be empty'],
    });

    expect(error.message).toBe('Please check the highlighted information and try again.');
    expect(error.details).toEqual(['email must be an email', 'name should not be empty']);
  });
});

describe('getApiErrorMessage', () => {
  it('returns controlled messages for known and unknown failures', () => {
    expect(
      getApiErrorMessage(
        new ApiRequestError({ kind: 'NETWORK', status: 0, message: 'Controlled message' }),
      ),
    ).toBe('Controlled message');
    expect(getApiErrorMessage(new Error('sensitive internal failure'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

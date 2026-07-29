import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard';

describe('InternalApiKeyGuard', () => {
  const expectedKey = 'internal-job-key-with-at-least-32-characters';
  const config = {
    getOrThrow: jest.fn().mockReturnValue(expectedKey),
  } as unknown as ConfigService;
  const guard = new InternalApiKeyGuard(config);

  function context(key?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: key ? { 'x-internal-api-key': key } : {},
        }),
      }),
    } as ExecutionContext;
  }

  it('accepts the configured internal API key', () => {
    expect(guard.canActivate(context(expectedKey))).toBe(true);
  });

  it.each([undefined, 'wrong-key'])('rejects a missing or invalid key', (key) => {
    expect(() => guard.canActivate(context(key))).toThrow(UnauthorizedException);
  });
});

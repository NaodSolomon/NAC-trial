import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('applies safe development defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      API_HOST: '0.0.0.0',
      API_PORT: 8000,
      DATABASE_PORT: 5432,
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    });
  });

  it('rejects invalid ports', () => {
    expect(() => validateEnvironment({ API_PORT: '70000' })).toThrow(
      'API_PORT must be an integer between 1 and 65535',
    );
  });

  it('requires strong JWT secrets in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'too-short',
        JWT_REFRESH_SECRET: 'a'.repeat(32),
        IP_HASH_SECRET: 'b'.repeat(32),
      }),
    ).toThrow('JWT_ACCESS_SECRET must contain at least 32 characters in production');
  });

  it('requires distinct secrets in production', () => {
    const sharedSecret = 'a'.repeat(32);

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: sharedSecret,
        JWT_REFRESH_SECRET: sharedSecret,
        IP_HASH_SECRET: 'b'.repeat(32),
      }),
    ).toThrow('JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and IP_HASH_SECRET must be different');
  });

  it('rejects malformed token durations during startup', () => {
    expect(() =>
      validateEnvironment({
        JWT_ACCESS_EXPIRY: 'fifteen minutes',
      }),
    ).toThrow('JWT_ACCESS_EXPIRY must use a duration such as 15m, 1h, or 7d');
  });
});

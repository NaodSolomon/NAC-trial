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
      STORAGE_DRIVER: 'minio',
      MAIL_DRIVER: 'mailpit',
      PAYMENT_DRIVER: 'fake',
      CACHE_DRIVER: 'redis',
      PAYMENTS_ENABLED: false,
      TRIAL_MODE: true,
      RATE_LIMIT_TTL_MS: 60_000,
      RATE_LIMIT_REQUESTS: 100,
      HTTP_LOG_SUCCESS_SAMPLE_RATE: 1,
      HTTP_SLOW_REQUEST_MS: 750,
      WEB_CONCURRENCY: 1,
      PASSWORD_RESET_TTL_MINUTES: 20,
      PASSWORD_RESET_URL: 'http://localhost:3000/admin/reset-password',
    });
  });

  it('never permits trial payment routes in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        TRIAL_MODE: true,
      }),
    ).toThrow('TRIAL_MODE cannot be enabled in production');
  });

  it('rejects unsupported local adapter drivers', () => {
    expect(() => validateEnvironment({ PAYMENT_DRIVER: 'unknown' })).toThrow(
      'PAYMENT_DRIVER must be one of: fake, paypal',
    );
  });

  it('requires an explicit PayPal enable switch for real payment mode', () => {
    expect(() =>
      validateEnvironment({
        PAYMENT_DRIVER: 'paypal',
        PAYMENTS_ENABLED: true,
        PAYPAL_ENABLED: false,
      }),
    ).toThrow('PAYPAL_ENABLED must be true when real PayPal payments are enabled');
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
        INTERNAL_API_KEY: 'c'.repeat(32),
      }),
    ).toThrow('JWT_ACCESS_SECRET must contain at least 32 characters in production');
  });

  it('requires a strong internal API key in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        IP_HASH_SECRET: 'c'.repeat(32),
        INTERNAL_API_KEY: 'too-short',
      }),
    ).toThrow('INTERNAL_API_KEY must contain at least 32 characters in production');
  });

  it('requires distinct secrets in production', () => {
    const sharedSecret = 'a'.repeat(32);

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: sharedSecret,
        JWT_REFRESH_SECRET: sharedSecret,
        IP_HASH_SECRET: 'b'.repeat(32),
        INTERNAL_API_KEY: 'c'.repeat(32),
      }),
    ).toThrow(
      'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, IP_HASH_SECRET, and INTERNAL_API_KEY must be different',
    );
  });

  it('rejects malformed token durations during startup', () => {
    expect(() =>
      validateEnvironment({
        JWT_ACCESS_EXPIRY: 'fifteen minutes',
      }),
    ).toThrow('JWT_ACCESS_EXPIRY must use a duration such as 15m, 1h, or 7d');
  });

  it('requires explicit object-storage configuration in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        IP_HASH_SECRET: 'c'.repeat(32),
        INTERNAL_API_KEY: 'd'.repeat(32),
        FRONTEND_URL: 'https://example.org',
      }),
    ).toThrow('STORAGE_ENDPOINT is required in production');
  });

  it('rejects oversized JSON request limits', () => {
    expect(() => validateEnvironment({ REQUEST_BODY_LIMIT_BYTES: 6_000_000 })).toThrow(
      'REQUEST_BODY_LIMIT_BYTES must be between 1024 and 5242880',
    );
  });

  it('rejects invalid global rate-limit settings', () => {
    expect(() => validateEnvironment({ RATE_LIMIT_REQUESTS: 0 })).toThrow(
      'RATE_LIMIT_REQUESTS must be between 1 and 2000000',
    );
    expect(() => validateEnvironment({ RATE_LIMIT_TTL_MS: 999 })).toThrow(
      'RATE_LIMIT_TTL_MS must be between 1000 and 3600000',
    );
  });

  it('validates HTTP log sampling and slow-request thresholds', () => {
    expect(() => validateEnvironment({ HTTP_LOG_SUCCESS_SAMPLE_RATE: 1.1 })).toThrow(
      'HTTP_LOG_SUCCESS_SAMPLE_RATE must be between 0 and 1',
    );
    expect(() => validateEnvironment({ HTTP_SLOW_REQUEST_MS: 0 })).toThrow(
      'HTTP_SLOW_REQUEST_MS must be between 1 and 60000',
    );
  });

  it('restricts API worker concurrency to a safe range', () => {
    expect(() => validateEnvironment({ WEB_CONCURRENCY: 0 })).toThrow(
      'WEB_CONCURRENCY must be between 1 and 16',
    );
    expect(() => validateEnvironment({ WEB_CONCURRENCY: 17 })).toThrow(
      'WEB_CONCURRENCY must be between 1 and 16',
    );
  });

  it('restricts password-reset expiration to the documented 15–30 minute range', () => {
    expect(() => validateEnvironment({ PASSWORD_RESET_TTL_MINUTES: 14 })).toThrow(
      'PASSWORD_RESET_TTL_MINUTES must be between 15 and 30',
    );
    expect(() => validateEnvironment({ PASSWORD_RESET_TTL_MINUTES: 31 })).toThrow(
      'PASSWORD_RESET_TTL_MINUTES must be between 15 and 30',
    );
  });

  it('requires HTTPS frontend origins in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        IP_HASH_SECRET: 'c'.repeat(32),
        INTERNAL_API_KEY: 'd'.repeat(32),
        FRONTEND_URL: 'http://example.org',
      }),
    ).toThrow('FRONTEND_URL origins must use HTTPS in production');
  });
});

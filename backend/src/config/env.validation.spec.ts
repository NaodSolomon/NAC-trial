import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('applies safe development defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      API_HOST: '0.0.0.0',
      API_PORT: 8000,
      DATABASE_PORT: 5432,
      JWT_EXPIRY: '15m',
    });
  });

  it('rejects invalid ports', () => {
    expect(() => validateEnvironment({ API_PORT: '70000' })).toThrow(
      'API_PORT must be an integer between 1 and 65535',
    );
  });

  it('requires a strong JWT secret in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow('JWT_SECRET must contain at least 32 characters in production');
  });
});

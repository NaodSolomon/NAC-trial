import { resolveDatabaseConnection } from './database-connection';

describe('resolveDatabaseConnection', () => {
  it('prefers TEST_DATABASE_URL in the test environment', () => {
    expect(
      resolveDatabaseConnection({
        NODE_ENV: 'test',
        TEST_DATABASE_URL: 'postgresql://test:test@localhost:5434/nehemiah_test',
        DATABASE_URL: 'postgresql://app:app@localhost:5432/nehemiah',
      }),
    ).toEqual({
      connectionString: 'postgresql://test:test@localhost:5434/nehemiah_test',
    });
  });

  it('uses DATABASE_URL for runtime and tooling connections', () => {
    expect(
      resolveDatabaseConnection({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://app:secret@postgres:5432/nehemiah',
        DATABASE_HOST: 'ignored-host',
      }),
    ).toEqual({
      connectionString: 'postgresql://app:secret@postgres:5432/nehemiah',
    });
  });

  it('falls back to the legacy connection fields', () => {
    expect(
      resolveDatabaseConnection({
        DATABASE_HOST: 'postgres',
        DATABASE_PORT: '5433',
        DATABASE_USER: 'nehemiah',
        DATABASE_PASSWORD: 'secret',
        DATABASE_NAME: 'nehemiah',
      }),
    ).toEqual({
      host: 'postgres',
      port: 5433,
      user: 'nehemiah',
      password: 'secret',
      database: 'nehemiah',
    });
  });

  it('rejects an invalid legacy database port', () => {
    expect(() => resolveDatabaseConnection({ DATABASE_PORT: 'invalid' })).toThrow(
      'DATABASE_PORT must be an integer between 1 and 65535',
    );
  });
});

const databaseUrl = process.env.TEST_DATABASE_URL;

if (databaseUrl) {
  process.stdout.write(
    '[integration] TEST_DATABASE_URL is configured; PostgreSQL suites will run.\n',
  );
} else {
  process.stderr.write(
    '[integration] TEST_DATABASE_URL is not configured; PostgreSQL suites will be skipped. Migration-chain checks will still run.\n',
  );
}

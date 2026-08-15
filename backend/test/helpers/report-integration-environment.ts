import {
  assertServiceSuitesCanRun,
  postgresConfigured,
  warnWhenSkipping,
} from './service-availability.helper';

try {
  assertServiceSuitesCanRun();
} catch (error) {
  process.stderr.write(`\n[integration] ${(error as Error).message}\n\n`);
  process.exit(1);
}

warnWhenSkipping((message) => process.stderr.write(message));

if (postgresConfigured) {
  process.stdout.write(
    '[integration] TEST_DATABASE_URL is configured; PostgreSQL suites will run.\n',
  );
}

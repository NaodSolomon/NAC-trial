const SKIP_FLAG = 'ALLOW_SKIP_DB_TESTS';

export const postgresConfigured = Boolean(process.env.TEST_DATABASE_URL);
export const mailConfigured = Boolean(process.env.TEST_MAIL_HOST);
export const skipDeliberatelyAllowed = process.env[SKIP_FLAG] === 'true';

function missingServices(): string[] {
  const missing: string[] = [];
  if (!postgresConfigured) missing.push('TEST_DATABASE_URL (PostgreSQL)');
  if (!mailConfigured) missing.push('TEST_MAIL_HOST (Mailpit)');
  return missing;
}

export function assertServiceSuitesCanRun(): void {
  const missing = missingServices();
  if (missing.length === 0 || skipDeliberatelyAllowed) return;

  throw new Error(
    [
      `Not configured: ${missing.join(', ')}.`,
      'Suites depending on them would be silently skipped, and a run that skips its',
      'service suites is not a passing run.',
      '',
      'Start the disposable stack and export the connection settings:',
      '  docker compose -f docker-compose.test.yml up -d',
      '  TEST_DATABASE_URL=postgresql://nehemiah_test:nehemiah_test@localhost:5434/nehemiah_test',
      '  TEST_MAIL_HOST=localhost TEST_MAIL_PORT=1026 TEST_MAILPIT_API_URL=http://localhost:8026',
      '',
      `To skip them on purpose, set ${SKIP_FLAG}=true.`,
    ].join('\n'),
  );
}

export function warnWhenSkipping(write: (message: string) => void): void {
  const missing = missingServices();
  if (missing.length === 0 || !skipDeliberatelyAllowed) return;

  write(
    [
      '',
      '  ============================================================',
      `  ${SKIP_FLAG}=true — service suites are being SKIPPED.`,
      `  Not configured: ${missing.join(', ')}.`,
      '  This run does NOT verify repository, migration or delivery behaviour.',
      '  ============================================================',
      '',
    ].join('\n'),
  );
}

export function requireDedicatedTestDatabase(
  connectionString = process.env.TEST_DATABASE_URL,
): string {
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required');

  const databaseName = new URL(connectionString).pathname.replace(/^\//, '');
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error(`Refusing to use a database not explicitly named for testing: ${databaseName}`);
  }
  return connectionString;
}

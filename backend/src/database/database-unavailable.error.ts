export class DatabaseUnavailableError extends Error {
  readonly cause: unknown;

  constructor(
    readonly operation: string,
    cause: unknown,
  ) {
    super(`Database operation ${operation} is unavailable`);
    this.name = 'DatabaseUnavailableError';
    this.cause = cause;
  }
}

const MAX_API_WORKERS = 16;

export function resolveWebConcurrency(value = process.env.WEB_CONCURRENCY): number {
  const workerCount = Number(value ?? 1);
  if (!Number.isSafeInteger(workerCount) || workerCount < 1 || workerCount > MAX_API_WORKERS) {
    throw new Error(`WEB_CONCURRENCY must be between 1 and ${MAX_API_WORKERS}`);
  }
  return workerCount;
}

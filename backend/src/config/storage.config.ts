import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.STORAGE_REGION ?? 'auto',
  bucket: process.env.STORAGE_BUCKET ?? 'nehemiah-media',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? 'minioadmin',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? 'minioadmin',
  publicUrl: (process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/nehemiah-media').replace(
    /\/+$/,
    '',
  ),
  maxFileSizeBytes: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES ?? 10_485_760),
  deletionWorkerEnabled:
    process.env.STORAGE_DELETION_WORKER_ENABLED !== undefined
      ? process.env.STORAGE_DELETION_WORKER_ENABLED === 'true'
      : process.env.NODE_ENV !== 'test',
  deletionWorkerIntervalMs: Number(process.env.STORAGE_DELETION_WORKER_INTERVAL_MS ?? 5_000),
  deletionWorkerBatchSize: Number(process.env.STORAGE_DELETION_WORKER_BATCH_SIZE ?? 10),
  deletionWorkerMaxAttempts: Number(process.env.STORAGE_DELETION_WORKER_MAX_ATTEMPTS ?? 5),
  deletionWorkerBackoffMs: Number(process.env.STORAGE_DELETION_WORKER_BACKOFF_MS ?? 30_000),
  deletionWorkerLockTimeoutMs: Number(
    process.env.STORAGE_DELETION_WORKER_LOCK_TIMEOUT_MS ?? 300_000,
  ),
}));

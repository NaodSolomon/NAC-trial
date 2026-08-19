import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  driver: process.env.MAIL_DRIVER ?? 'mailpit',
  host: process.env.MAIL_HOST ?? 'mailpit',
  port: Number(process.env.MAIL_PORT ?? 1025),
  user: process.env.MAIL_USER ?? null,
  password: process.env.MAIL_PASSWORD ?? null,
  secure: process.env.MAIL_SECURE === 'true',
  from: process.env.MAIL_FROM ?? 'noreply@nehemiah.local',
  contactNotificationEmail: process.env.CONTACT_NOTIFICATION_EMAIL ?? 'contact@nehemiah.local',
  connectionTimeoutMs: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS ?? 3_000),
  greetingTimeoutMs: Number(process.env.MAIL_GREETING_TIMEOUT_MS ?? 3_000),
  socketTimeoutMs: Number(process.env.MAIL_SOCKET_TIMEOUT_MS ?? 10_000),
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 20),
  passwordResetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:3000/admin/reset-password',
  outboxWorkerEnabled:
    process.env.OUTBOX_WORKER_ENABLED !== undefined
      ? process.env.OUTBOX_WORKER_ENABLED === 'true'
      : process.env.NODE_ENV !== 'test',
  outboxWorkerIntervalMs: Number(process.env.OUTBOX_WORKER_INTERVAL_MS ?? 5_000),
  outboxWorkerBatchSize: Number(process.env.OUTBOX_WORKER_BATCH_SIZE ?? 10),
  outboxWorkerMaxAttempts: Number(process.env.OUTBOX_WORKER_MAX_ATTEMPTS ?? 5),
  outboxWorkerBackoffMs: Number(process.env.OUTBOX_WORKER_BACKOFF_MS ?? 30_000),
  outboxWorkerLockTimeoutMs: Number(process.env.OUTBOX_WORKER_LOCK_TIMEOUT_MS ?? 300_000),
}));

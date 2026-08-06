import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'mailpit',
  port: Number(process.env.MAIL_PORT ?? 1025),
  from: process.env.MAIL_FROM ?? 'noreply@nehemiah.local',
  connectionTimeoutMs: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS ?? 3_000),
  greetingTimeoutMs: Number(process.env.MAIL_GREETING_TIMEOUT_MS ?? 3_000),
  socketTimeoutMs: Number(process.env.MAIL_SOCKET_TIMEOUT_MS ?? 10_000),
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 20),
  passwordResetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:3000/admin/reset-password',
}));

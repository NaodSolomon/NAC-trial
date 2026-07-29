import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'mailpit',
  port: Number(process.env.MAIL_PORT ?? 1025),
  from: process.env.MAIL_FROM ?? 'noreply@nehemiah.local',
}));

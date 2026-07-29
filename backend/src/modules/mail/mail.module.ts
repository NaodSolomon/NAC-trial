import { Module } from '@nestjs/common';
import { MAILER } from './mail.interface';
import { MailpitMailerService } from './mailpit-mailer.service';

@Module({
  providers: [MailpitMailerService, { provide: MAILER, useExisting: MailpitMailerService }],
  exports: [MAILER],
})
export class MailModule {}

import { Module } from '@nestjs/common';
import { MAILER } from './mail.interface';
import { MailpitMailerService } from './mailpit-mailer.service';
import { PasswordResetMailerService } from './password-reset-mailer.service';

@Module({
  providers: [
    MailpitMailerService,
    PasswordResetMailerService,
    { provide: MAILER, useExisting: MailpitMailerService },
  ],
  exports: [MAILER, PasswordResetMailerService],
})
export class MailModule {}

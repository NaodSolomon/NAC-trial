import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER } from './mail.interface';
import { MailpitMailerService } from './mailpit-mailer.service';
import { SmtpMailerService } from './smtp-mailer.service';
import { PasswordResetMailerService } from './password-reset-mailer.service';

@Module({
  providers: [
    PasswordResetMailerService,
    {
      provide: MAILER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('mail.driver') === 'smtp'
          ? new SmtpMailerService(config)
          : new MailpitMailerService(config),
    },
  ],
  exports: [MAILER, PasswordResetMailerService],
})
export class MailModule {}

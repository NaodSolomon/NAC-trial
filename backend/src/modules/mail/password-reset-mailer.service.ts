import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER, Mailer } from './mail.interface';

@Injectable()
export class PasswordResetMailerService {
  constructor(
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly config: ConfigService,
  ) {}

  send(email: string, rawToken: string): Promise<void> {
    const resetUrl = new URL(this.config.getOrThrow<string>('mail.passwordResetUrl'));
    resetUrl.searchParams.set('token', rawToken);

    return this.mailer.send({
      to: email,
      subject: 'Reset your Nehemiah Autism Center administrator password',
      text: [
        'A password reset was requested for your administrator account.',
        '',
        `Reset your password: ${resetUrl.toString()}`,
        '',
        `This link expires in ${this.config.getOrThrow<number>('mail.passwordResetTtlMinutes')} minutes.`,
        'If you did not request this change, you can ignore this email.',
      ].join('\n'),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Mailer, MailMessage } from './mail.interface';

@Injectable()
export class SmtpMailerService implements Mailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.getOrThrow<string>('mail.from');
    this.transport = nodemailer.createTransport(smtpTransportOptions(config));
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      messageId: message.messageId,
    });
  }
}

export function smtpTransportOptions(config: ConfigService): SMTPTransport.Options {
  const secure = config.getOrThrow<boolean>('mail.secure');
  return {
    host: config.getOrThrow<string>('mail.host'),
    port: config.getOrThrow<number>('mail.port'),
    // Implicit TLS when secure (465); otherwise STARTTLS is mandatory, so credentials
    // are never written to a connection that could not be upgraded.
    secure,
    requireTLS: !secure,
    auth: {
      user: config.getOrThrow<string>('mail.user'),
      pass: config.getOrThrow<string>('mail.password'),
    },
    connectionTimeout: config.getOrThrow<number>('mail.connectionTimeoutMs'),
    greetingTimeout: config.getOrThrow<number>('mail.greetingTimeoutMs'),
    socketTimeout: config.getOrThrow<number>('mail.socketTimeoutMs'),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Mailer, MailMessage } from './mail.interface';

@Injectable()
export class MailpitMailerService implements Mailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.getOrThrow<string>('mail.from');
    this.transport = nodemailer.createTransport(mailpitTransportOptions(config));
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

export function mailpitTransportOptions(config: ConfigService): SMTPTransport.Options {
  return {
    host: config.getOrThrow<string>('mail.host'),
    port: config.getOrThrow<number>('mail.port'),
    secure: false,
    ignoreTLS: true,
    connectionTimeout: config.getOrThrow<number>('mail.connectionTimeoutMs'),
    greetingTimeout: config.getOrThrow<number>('mail.greetingTimeoutMs'),
    socketTimeout: config.getOrThrow<number>('mail.socketTimeoutMs'),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection, Socket } from 'node:net';
import { Mailer, MailMessage } from './mail.interface';

@Injectable()
export class MailpitMailerService implements Mailer {
  constructor(private readonly config: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const socket = createConnection({
      host: this.config.getOrThrow<string>('mail.host'),
      port: this.config.getOrThrow<number>('mail.port'),
    });
    try {
      await this.response(socket);
      await this.command(socket, 'EHLO nehemiah.local');
      await this.command(socket, `MAIL FROM:<${this.config.getOrThrow<string>('mail.from')}>`);
      await this.command(socket, `RCPT TO:<${message.to}>`);
      await this.command(socket, 'DATA', 354);
      await this.command(
        socket,
        [
          `From: ${this.config.getOrThrow<string>('mail.from')}`,
          `To: ${message.to}`,
          `Subject: ${message.subject.replaceAll(/[\r\n]/g, ' ')}`,
          'Content-Type: text/plain; charset=utf-8',
          '',
          message.text,
          '.',
        ].join('\r\n'),
      );
      socket.write('QUIT\r\n');
    } finally {
      socket.end();
    }
  }

  private async command(socket: Socket, value: string, expected = 250): Promise<void> {
    socket.write(`${value}\r\n`);
    const response = await this.response(socket);
    if (!response.startsWith(String(expected))) {
      throw new Error(`Mailpit SMTP rejected a command with ${response.slice(0, 3)}`);
    }
  }

  private response(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      socket.once('data', (chunk) => resolve(chunk.toString('utf8')));
      socket.once('error', reject);
    });
  }
}

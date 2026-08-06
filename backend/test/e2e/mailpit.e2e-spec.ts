import { ConfigService } from '@nestjs/config';
import { MailpitMailerService } from '../../src/modules/mail/mailpit-mailer.service';
import { clearMailpitMailbox, waitForMailpitText } from '../helpers/mailpit-test.helper';

describe('Mailpit SMTP adapter (e2e)', () => {
  const mailer = new MailpitMailerService(mailpitConfig());

  beforeAll(async () => clearMailpitMailbox());

  it('delivers password-reset and donation-receipt messages to real Mailpit', async () => {
    await mailer.send({
      to: 'administrator@example.org',
      subject: 'Reset your Nehemiah administrator password',
      text: 'Reset your password: http://localhost:3000/admin/reset-password?token=test-token',
    });
    expect(await waitForMailpitText('Reset your password:')).toContain('test-token');

    await mailer.send({
      to: 'donor@example.org',
      subject: 'Your simulated Nehemiah Autism Center donation receipt',
      text: 'Test receipt: http://localhost:9000/nehemiah-media/receipts/test.pdf',
    });
    expect(await waitForMailpitText('Test receipt:')).toContain('/receipts/test.pdf');
  });
});

function mailpitConfig(): ConfigService {
  const values: Record<string, string | number> = {
    'mail.host': process.env.TEST_MAIL_HOST ?? '127.0.0.1',
    'mail.port': Number(process.env.TEST_MAIL_PORT ?? 1026),
    'mail.from': 'noreply@nehemiah.local',
    'mail.connectionTimeoutMs': 3_000,
    'mail.greetingTimeoutMs': 3_000,
    'mail.socketTimeoutMs': 10_000,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) throw new Error(`Unexpected config key ${key}`);
      return values[key];
    }),
  } as unknown as ConfigService;
}

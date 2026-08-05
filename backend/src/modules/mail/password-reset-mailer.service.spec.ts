import { ConfigService } from '@nestjs/config';
import { Mailer } from './mail.interface';
import { PasswordResetMailerService } from './password-reset-mailer.service';

describe('PasswordResetMailerService', () => {
  it('places the raw token only in the configured frontend reset URL', async () => {
    const mailer: jest.Mocked<Mailer> = { send: jest.fn() };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'mail.passwordResetUrl') {
          return 'http://localhost:3000/admin/reset-password';
        }
        if (key === 'mail.passwordResetTtlMinutes') return 20;
        throw new Error(`Unexpected config key ${key}`);
      }),
    } as unknown as ConfigService;
    const service = new PasswordResetMailerService(mailer, config);
    const rawToken = 'c'.repeat(64);

    await service.send('admin@example.org', rawToken);

    const message = mailer.send.mock.calls[0][0];
    const occurrences = message.text.split(rawToken).length - 1;
    expect(occurrences).toBe(1);
    expect(message.text).toContain(`http://localhost:3000/admin/reset-password?token=${rawToken}`);
    expect(message.subject).not.toContain(rawToken);
    expect(message.to).toBe('admin@example.org');
  });
});

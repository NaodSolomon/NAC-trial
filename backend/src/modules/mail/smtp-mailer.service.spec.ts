import { ConfigService } from '@nestjs/config';
import { AddressInfo, createServer, Server, Socket } from 'node:net';
import { SmtpMailerService, smtpTransportOptions } from './smtp-mailer.service';

describe('SmtpMailerService', () => {
  it('enforces STARTTLS when implicit TLS is off, so credentials never travel in clear text', () => {
    expect(smtpTransportOptions(mailConfig({ secure: false }))).toMatchObject({
      host: 'smtp.example.org',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'apikey', pass: 'smtp-credential' },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  it('uses implicit TLS without STARTTLS on secure transports', () => {
    expect(smtpTransportOptions(mailConfig({ secure: true, port: 465 }))).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    });
  });

  it('never disables TLS the way the development transport does', () => {
    const options = smtpTransportOptions(mailConfig({ secure: false }));
    expect(options).not.toHaveProperty('ignoreTLS');
  });

  it('applies the configured connection, greeting, and socket timeouts', () => {
    expect(
      smtpTransportOptions(
        mailConfig({ connectionTimeoutMs: 1_500, greetingTimeoutMs: 2_000, socketTimeoutMs: 4_000 }),
      ),
    ).toMatchObject({ connectionTimeout: 1_500, greetingTimeout: 2_000, socketTimeout: 4_000 });
  });

  it('refuses to send through a server that cannot upgrade to TLS', async () => {
    // A live SMTP conversation against a server that advertises no STARTTLS: the
    // transport must abort before AUTH rather than fall back to plain text.
    const fixture = await plaintextOnlySmtpServer();
    try {
      const service = new SmtpMailerService(mailConfig({ secure: false, port: fixture.port }));

      await expect(
        service.send({ to: 'admin@example.org', subject: 'Reset', text: 'Body' }),
      ).rejects.toThrow(/TLS/i);
      expect(fixture.sawAuth).toBe(false);
      expect(fixture.sawMailFrom).toBe(false);
    } finally {
      await closeFixture(fixture);
    }
  });
});

interface PlainSmtpFixture {
  server: Server;
  sockets: Set<Socket>;
  port: number;
  sawAuth: boolean;
  sawMailFrom: boolean;
}

function mailConfig(
  overrides: {
    secure?: boolean;
    port?: number;
    connectionTimeoutMs?: number;
    greetingTimeoutMs?: number;
    socketTimeoutMs?: number;
  } = {},
): ConfigService {
  const values: Record<string, string | number | boolean> = {
    'mail.host': overrides.port ? '127.0.0.1' : 'smtp.example.org',
    'mail.port': overrides.port ?? 587,
    'mail.user': 'apikey',
    'mail.password': 'smtp-credential',
    'mail.secure': overrides.secure ?? false,
    'mail.from': 'noreply@example.org',
    'mail.connectionTimeoutMs': overrides.connectionTimeoutMs ?? 500,
    'mail.greetingTimeoutMs': overrides.greetingTimeoutMs ?? 500,
    'mail.socketTimeoutMs': overrides.socketTimeoutMs ?? 1_000,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) throw new Error(`Unexpected config key ${key}`);
      return values[key];
    }),
  } as unknown as ConfigService;
}

async function plaintextOnlySmtpServer(): Promise<PlainSmtpFixture> {
  const sockets = new Set<Socket>();
  const fixture: PlainSmtpFixture = {
    server: createServer(),
    sockets,
    port: 0,
    sawAuth: false,
    sawMailFrom: false,
  };
  fixture.server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 plaintext.test ESMTP ready\r\n');
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let lineEnd = buffer.indexOf('\r\n');
      while (lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        if (line.startsWith('AUTH')) fixture.sawAuth = true;
        if (line.startsWith('MAIL FROM:')) fixture.sawMailFrom = true;
        if (line.startsWith('EHLO')) {
          socket.write('250-plaintext.test Hello\r\n250 8BITMIME\r\n');
        } else if (line === 'STARTTLS') {
          // The transport asks even when the capability is not advertised; a plain
          // 250 here would trick it into a TLS handshake over a plaintext socket.
          socket.write('454 4.7.0 TLS not available\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 2.0.0 closing connection\r\n');
        } else if (line) {
          socket.write('250 2.0.0 accepted\r\n');
        }
        lineEnd = buffer.indexOf('\r\n');
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    fixture.server.once('error', reject);
    fixture.server.listen(0, '127.0.0.1', resolve);
  });
  fixture.port = (fixture.server.address() as AddressInfo).port;
  return fixture;
}

async function closeFixture(fixture: PlainSmtpFixture): Promise<void> {
  for (const socket of fixture.sockets) socket.destroy();
  if (!fixture.server.listening) return;
  await new Promise<void>((resolve, reject) =>
    fixture.server.close((error) => (error ? reject(error) : resolve())),
  );
}

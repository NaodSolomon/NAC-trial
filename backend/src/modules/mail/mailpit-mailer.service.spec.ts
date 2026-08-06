import { ConfigService } from '@nestjs/config';
import { AddressInfo, createServer, Server, Socket } from 'node:net';
import { MailpitMailerService, mailpitTransportOptions } from './mailpit-mailer.service';

interface SmtpFixture {
  server: Server;
  sockets: Set<Socket>;
  messages: string[];
  port: number;
}

describe('MailpitMailerService', () => {
  const fixtures: SmtpFixture[] = [];

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map(closeFixture));
  });

  it('delivers mail when valid greeting and multiline responses are TCP-fragmented', async () => {
    const fixture = await fragmentedSmtpServer();
    fixtures.push(fixture);
    const service = new MailpitMailerService(mailConfig(fixture.port));

    await service.send({
      to: 'administrator@example.org',
      subject: 'Password reset instructions',
      text: 'Use the single-use reset link.',
    });

    expect(fixture.messages).toHaveLength(1);
    expect(fixture.messages[0]).toContain('To: administrator@example.org');
    expect(fixture.messages[0]).toContain('Subject: Password reset instructions');
    expect(fixture.messages[0]).toContain('Use the single-use reset link.');
  });

  it('fails within the configured greeting timeout when SMTP accepts but never greets', async () => {
    const fixture = await silentSmtpServer();
    fixtures.push(fixture);
    const service = new MailpitMailerService(
      mailConfig(fixture.port, { greetingTimeoutMs: 100, socketTimeoutMs: 1_000 }),
    );
    const startedAt = Date.now();

    await expect(
      service.send({ to: 'admin@example.org', subject: 'Timeout', text: 'Body' }),
    ).rejects.toMatchObject({ code: 'ETIMEDOUT' });
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  it('configures bounded connection, greeting, and socket timeouts', () => {
    expect(
      mailpitTransportOptions(
        mailConfig(1025, {
          connectionTimeoutMs: 1_500,
          greetingTimeoutMs: 2_000,
          socketTimeoutMs: 4_000,
        }),
      ),
    ).toMatchObject({
      host: '127.0.0.1',
      port: 1025,
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 1_500,
      greetingTimeout: 2_000,
      socketTimeout: 4_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });
});

function mailConfig(
  port: number,
  timeouts: {
    connectionTimeoutMs?: number;
    greetingTimeoutMs?: number;
    socketTimeoutMs?: number;
  } = {},
): ConfigService {
  const values: Record<string, string | number> = {
    'mail.host': '127.0.0.1',
    'mail.port': port,
    'mail.from': 'noreply@nehemiah.local',
    'mail.connectionTimeoutMs': timeouts.connectionTimeoutMs ?? 500,
    'mail.greetingTimeoutMs': timeouts.greetingTimeoutMs ?? 500,
    'mail.socketTimeoutMs': timeouts.socketTimeoutMs ?? 1_000,
  };
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) throw new Error(`Unexpected config key ${key}`);
      return values[key];
    }),
  } as unknown as ConfigService;
}

async function fragmentedSmtpServer(): Promise<SmtpFixture> {
  const messages: string[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('2');
    setTimeout(() => socket.write('20 fragmented.test ESMTP ready\r\n'), 5);

    let buffer = '';
    let receivingData = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      processInput();
    });

    function processInput(): void {
      if (receivingData) {
        const terminator = buffer.indexOf('\r\n.\r\n');
        if (terminator < 0) return;
        messages.push(buffer.slice(0, terminator));
        buffer = buffer.slice(terminator + 5);
        receivingData = false;
        socket.write('250 2.0.0 queued\r\n');
      }

      let lineEnd = buffer.indexOf('\r\n');
      while (!receivingData && lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        if (line.startsWith('EHLO')) {
          socket.write('250-fragmented.test Hello\r\n250-PIPE');
          setTimeout(() => socket.write('LINING\r\n250 8BITMIME\r\n'), 5);
        } else if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
          socket.write('250 2.1.0 accepted\r\n');
        } else if (line === 'DATA') {
          receivingData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 2.0.0 closing connection\r\n');
        } else if (line) {
          socket.write('500 5.5.2 unsupported command\r\n');
        }
        lineEnd = buffer.indexOf('\r\n');
      }
    }
  });
  const port = await listen(server);
  return { server, sockets, messages, port };
}

async function silentSmtpServer(): Promise<SmtpFixture> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  const port = await listen(server);
  return { server, sockets, messages: [], port };
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return (server.address() as AddressInfo).port;
}

async function closeFixture(fixture: SmtpFixture): Promise<void> {
  for (const socket of fixture.sockets) socket.destroy();
  if (!fixture.server.listening) return;
  await new Promise<void>((resolve, reject) =>
    fixture.server.close((error) => (error ? reject(error) : resolve())),
  );
}

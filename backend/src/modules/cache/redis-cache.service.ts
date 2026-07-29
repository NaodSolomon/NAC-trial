import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';
import { ApplicationCache } from './cache.interface';

@Injectable()
export class RedisCacheService implements ApplicationCache {
  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<boolean> {
    return (await this.execute(['PING'])) === 'PONG';
  }

  get(key: string): Promise<string | null> {
    return this.execute(['GET', key]);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const command = ['SET', key, value];
    if (ttlSeconds) command.push('EX', String(ttlSeconds));
    await this.execute(command);
  }

  private execute(parts: string[]): Promise<string | null> {
    const payload = `*${parts.length}\r\n${parts
      .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
      .join('')}`;
    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: this.config.getOrThrow<string>('cache.host'),
        port: this.config.getOrThrow<number>('cache.port'),
      });
      socket.setTimeout(2_000);
      socket.once('connect', () => socket.write(payload));
      socket.once('data', (chunk) => {
        socket.end();
        const response = chunk.toString('utf8');
        if (response.startsWith('-')) return reject(new Error(response.slice(1).trim()));
        if (response.startsWith('$-1')) return resolve(null);
        if (response.startsWith('$')) return resolve(response.split('\r\n')[1] ?? null);
        resolve(response.slice(1).trim());
      });
      socket.once('timeout', () => socket.destroy(new Error('Redis connection timed out')));
      socket.once('error', reject);
    });
  }
}

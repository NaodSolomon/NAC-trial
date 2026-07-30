import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';
import {
  ApplicationCache,
  PUBLIC_CACHE_NAMESPACES,
  PublicCacheNamespace,
} from './cache.interface';

@Injectable()
export class RedisCacheService implements ApplicationCache {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly dirtyNamespaces = new Set<PublicCacheNamespace>();

  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<boolean> {
    return (await this.execute(['PING'])) === 'PONG';
  }

  async remember<T>(
    namespace: PublicCacheNamespace,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    let cacheKey: string | null = null;
    try {
      if (this.dirtyNamespaces.has(namespace)) {
        await this.execute(['INCR', this.versionKey(namespace)]);
        this.dirtyNamespaces.delete(namespace);
      }
      const version = (await this.execute(['GET', this.versionKey(namespace)])) ?? '1';
      cacheKey = `nac:${namespace}:v${version}:${key}`;
      const cached = await this.execute(['GET', cacheKey]);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch {
      this.dirtyNamespaces.add(namespace);
      this.logger.warn(`Redis unavailable for ${namespace}; using PostgreSQL`);
    }

    const value = await loader();
    if (cacheKey) {
      await this.execute(['SET', cacheKey, JSON.stringify(value), 'EX', String(ttlSeconds)]).catch(
        () => this.logger.warn(`Redis write unavailable for ${namespace}`),
      );
    }
    return value;
  }

  async invalidate(namespace: PublicCacheNamespace): Promise<void> {
    try {
      await this.execute(['INCR', this.versionKey(namespace)]);
    } catch {
      // Cache invalidation must never roll back a successful database mutation.
      this.dirtyNamespaces.add(namespace);
      this.logger.warn(`Redis invalidation unavailable for ${namespace}`);
    }
  }

  async clear(): Promise<void> {
    await Promise.all(PUBLIC_CACHE_NAMESPACES.map((namespace) => this.invalidate(namespace)));
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

  private versionKey(namespace: PublicCacheNamespace): string {
    return `nac:${namespace}:version`;
  }
}

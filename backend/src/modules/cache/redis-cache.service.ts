import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApplicationCache,
  PUBLIC_CACHE_NAMESPACES,
  PublicCacheNamespace,
} from './cache.interface';
import { REDIS_CLIENT, RedisClient } from './redis-client.provider';

@Injectable()
export class RedisCacheService implements ApplicationCache, OnApplicationShutdown {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly dirtyNamespaces = new Set<PublicCacheNamespace>();
  private readonly commandTimeoutMs: number;
  private readonly circuitCooldownMs: number;
  private connectPromise: Promise<void> | null = null;
  private circuitOpenUntil = 0;
  private recoveryProbeActive = false;
  private outageWarningLogged = false;

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly client: RedisClient,
  ) {
    this.commandTimeoutMs = this.config.getOrThrow<number>('cache.commandTimeoutMs');
    this.circuitCooldownMs = this.config.getOrThrow<number>('cache.circuitCooldownMs');
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.execute(() => this.client.ping())) === 'PONG';
    } catch {
      return false;
    }
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
        await this.execute(() => this.client.incr(this.versionKey(namespace)));
        this.dirtyNamespaces.delete(namespace);
      }
      const version =
        (await this.execute(() => this.client.get(this.versionKey(namespace)))) ?? '1';
      cacheKey = `nac:${namespace}:v${version}:${key}`;
      const cached = await this.execute(() => this.client.get(cacheKey));
      if (cached !== null) return JSON.parse(String(cached)) as T;
    } catch {
      this.dirtyNamespaces.add(namespace);
      this.logOutage(`Redis unavailable for ${namespace}; using PostgreSQL`);
    }

    const value = await loader();
    if (cacheKey) {
      await this.execute(() => this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(value))).catch(
        () => this.logOutage(`Redis write unavailable for ${namespace}`),
      );
    }
    return value;
  }

  async invalidate(namespace: PublicCacheNamespace): Promise<void> {
    try {
      await this.execute(() => this.client.incr(this.versionKey(namespace)));
    } catch {
      // Cache invalidation must never roll back a successful database mutation.
      this.dirtyNamespaces.add(namespace);
      this.logOutage(`Redis invalidation unavailable for ${namespace}`);
    }
  }

  async clear(): Promise<void> {
    await Promise.all(PUBLIC_CACHE_NAMESPACES.map((namespace) => this.invalidate(namespace)));
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) await this.client.close();
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (now < this.circuitOpenUntil) throw new Error('Redis circuit is open');

    const isRecoveryProbe = this.circuitOpenUntil !== 0;
    if (isRecoveryProbe && this.recoveryProbeActive) {
      throw new Error('Redis recovery probe is already running');
    }
    if (isRecoveryProbe) this.recoveryProbeActive = true;

    try {
      await this.withTimeout(this.ensureConnected());
      const result = await this.withTimeout(operation());
      this.circuitOpenUntil = 0;
      this.outageWarningLogged = false;
      return result;
    } catch (error) {
      this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
      if (this.client.isOpen) this.client.destroy();
      this.connectPromise = null;
      throw error;
    } finally {
      if (isRecoveryProbe) this.recoveryProbeActive = false;
    }
  }

  private ensureConnected(): Promise<void> {
    if (this.client.isReady) return Promise.resolve();
    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => undefined)
        .finally(() => {
          this.connectPromise = null;
        });
    }
    return this.connectPromise;
  }

  private withTimeout<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Redis operation exceeded ${this.commandTimeoutMs}ms`)),
        this.commandTimeoutMs,
      );
      timer.unref();
      operation.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private logOutage(message: string): void {
    if (this.outageWarningLogged) return;
    this.outageWarningLogged = true;
    this.logger.warn(message);
  }

  private versionKey(namespace: PublicCacheNamespace): string {
    return `nac:${namespace}:version`;
  }
}

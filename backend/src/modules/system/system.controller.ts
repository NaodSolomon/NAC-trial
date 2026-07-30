import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import { ConfigService } from '@nestjs/config';
import { ApplicationCache, CACHE } from '../cache/cache.interface';

@Controller('system')
export class SystemController {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  @Get('health')
  async health() {
    const [database, redis] = await Promise.all([
      this.db
        .execute(sql`select 1`)
        .then(() => 'connected' as const)
        .catch(() => 'unavailable' as const),
      this.cache
        .ping()
        .then((connected) => (connected ? ('connected' as const) : ('unavailable' as const)))
        .catch(() => 'unavailable' as const),
    ]);
    return {
      status: database === 'connected' && redis === 'connected' ? 'ok' : 'degraded',
      checks: { postgresql: database, redis },
      // Kept for clients using the original Step 14 health shape.
      database,
      redis,
      mode: this.config.get<boolean>('runtime.trialMode') ? 'trial' : 'production',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  version() {
    return {
      name: 'Nehemiah Autism Center API',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
      mode: this.config.get<boolean>('runtime.trialMode') ? 'trial' : 'production',
      adapters: {
        storage: this.config.get<string>('runtime.storageDriver'),
        mail: this.config.get<string>('runtime.mailDriver'),
        payment: this.config.get<string>('runtime.paymentDriver'),
        cache: this.config.get<string>('runtime.cacheDriver'),
      },
      realPaymentsEnabled:
        this.config.get<string>('runtime.paymentDriver') === 'paypal' &&
        this.config.get<boolean>('runtime.paymentsEnabled') === true,
    };
  }
}

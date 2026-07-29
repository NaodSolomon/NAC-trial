import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import { ConfigService } from '@nestjs/config';

@Controller('system')
export class SystemController {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  async health() {
    await this.db.execute(sql`select 1`);
    return {
      status: 'ok',
      database: 'connected',
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

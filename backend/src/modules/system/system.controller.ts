import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';
import { ApplicationCache, CACHE } from '../cache/cache.interface';

type DependencyStatus = 'connected' | 'unavailable';
const DEPENDENCY_PROBE_TIMEOUT_MS = 2_000;

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
    @Inject(CACHE) private readonly cache: ApplicationCache,
  ) {}

  @Get('health/live')
  @ApiOperation({ summary: 'Check whether the API process is alive' })
  @ApiResponse({ status: 200, description: 'The API process is accepting requests' })
  liveness() {
    return {
      status: 'ok',
      process: 'alive',
      mode: this.mode(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['health', 'health/ready'])
  @ApiOperation({ summary: 'Check PostgreSQL readiness and optional Redis availability' })
  @ApiResponse({ status: 200, description: 'PostgreSQL is ready; Redis may be degraded' })
  @ApiResponse({ status: 503, description: 'PostgreSQL is unavailable' })
  async health(@Res({ passthrough: true }) reply: FastifyReply) {
    const [database, redis] = await Promise.all([
      this.probe(() => this.db.execute(sql`select 1`).then(() => true)),
      this.probe(() => this.cache.ping()),
    ]);

    if (database === 'unavailable') {
      reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status:
        database === 'unavailable' ? 'unavailable' : redis === 'unavailable' ? 'degraded' : 'ok',
      checks: { postgresql: database, redis },
      // Kept for clients using the original Step 14 health shape.
      database,
      redis,
      mode: this.mode(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  version() {
    return {
      name: 'Nehemiah Autism Center API',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
      mode: this.mode(),
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

  private async probe(check: () => Promise<boolean>): Promise<DependencyStatus> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      const connected = await Promise.race([
        check(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), DEPENDENCY_PROBE_TIMEOUT_MS);
        }),
      ]);
      return connected ? 'connected' : 'unavailable';
    } catch {
      return 'unavailable';
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private mode(): 'trial' | 'production' {
    return this.config.get<boolean>('runtime.trialMode') ? 'trial' : 'production';
  }
}

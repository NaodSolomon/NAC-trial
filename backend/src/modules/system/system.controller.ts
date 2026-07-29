import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/drizzle.module';

@Controller('system')
export class SystemController {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  @Get('health')
  async health() {
    await this.db.execute(sql`select 1`);
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  version() {
    return {
      name: 'Nehemiah Autism Center API',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}

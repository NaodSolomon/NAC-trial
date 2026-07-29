import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { validateEnvironment } from './config/env.validation';
import { DrizzleModule } from './database/drizzle.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validate: validateEnvironment,
    }),
    DrizzleModule,
    AuthModule,
    AdminsModule,
    AuditModule,
  ],
})
export class AppModule {}

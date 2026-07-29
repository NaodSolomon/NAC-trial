import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import storageConfig from './config/storage.config';
import { validateEnvironment } from './config/env.validation';
import { DrizzleModule } from './database/drizzle.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CmsModule } from './modules/cms/cms.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MediaModule } from './modules/media/media.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ContactModule } from './modules/contact/contact.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import paymentConfig from './config/payment.config';
import { DonationsModule } from './modules/donations/donations.module';
import { EventsModule } from './modules/events/events.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { SystemModule } from './modules/system/system.module';
import runtimeConfig from './config/runtime.config';
import mailConfig from './config/mail.config';
import cacheConfig from './config/cache.config';
import { MailModule } from './modules/mail/mail.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        storageConfig,
        paymentConfig,
        runtimeConfig,
        mailConfig,
        cacheConfig,
      ],
      validate: validateEnvironment,
    }),
    DrizzleModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    AuthModule,
    AdminsModule,
    AuditModule,
    CmsModule,
    NavigationModule,
    SettingsModule,
    MediaModule,
    ContactModule,
    EngagementModule,
    DonationsModule,
    EventsModule,
    GalleryModule,
    AnalyticsModule,
    SystemModule,
    MailModule,
    CacheModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}

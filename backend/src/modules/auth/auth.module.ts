import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ADMIN_REPOSITORY } from '../admins/interfaces/admin-repository.interface';
import { DrizzleAdminRepository } from '../admins/repositories/drizzle-admin.repository';
import { AuthController } from './controllers/auth.controller';
import { AdminSessionsController } from './controllers/admin-sessions.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { AUTH_SESSION_REPOSITORY } from './interfaces/auth-session-repository.interface';
import { DrizzleAuthSessionRepository } from './repositories/drizzle-auth-session.repository';
import { PASSWORD_RESET_REPOSITORY } from './interfaces/password-reset-repository.interface';
import { DrizzlePasswordResetRepository } from './repositories/drizzle-password-reset.repository';
import { AuthService } from './services/auth.service';
import { AdminSessionsService } from './services/admin-sessions.service';
import { PasswordResetService } from './services/password-reset.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MailModule,
  ],
  controllers: [AuthController, AdminSessionsController, PasswordResetController],
  providers: [
    AuthService,
    AdminSessionsService,
    PasswordResetService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: ADMIN_REPOSITORY,
      useClass: DrizzleAdminRepository,
    },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: DrizzleAuthSessionRepository,
    },
    {
      provide: PASSWORD_RESET_REPOSITORY,
      useClass: DrizzlePasswordResetRepository,
    },
  ],
  exports: [JwtAuthGuard, ADMIN_REPOSITORY],
})
export class AuthModule {}

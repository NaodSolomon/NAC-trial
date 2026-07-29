import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ADMIN_REPOSITORY } from '../admins/interfaces/admin-repository.interface';
import { DrizzleAdminRepository } from '../admins/repositories/drizzle-admin.repository';
import { AuthController } from './controllers/auth.controller';
import { AUTH_SESSION_REPOSITORY } from './interfaces/auth-session-repository.interface';
import { DrizzleAuthSessionRepository } from './repositories/drizzle-auth-session.repository';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: ADMIN_REPOSITORY,
      useClass: DrizzleAdminRepository,
    },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: DrizzleAuthSessionRepository,
    },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}

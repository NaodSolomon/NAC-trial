import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  ADMIN_REPOSITORY,
  AdminRepository,
} from '../../admins/interfaces/admin-repository.interface';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSessionRepository,
} from '../interfaces/auth-session-repository.interface';
import { AccessTokenPayload, AdminPrincipal } from '../interfaces/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(ADMIN_REPOSITORY)
    private readonly admins: AdminRepository,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
      issuer: config.getOrThrow<string>('jwt.issuer'),
      audience: config.getOrThrow<string>('jwt.audience'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AdminPrincipal> {
    if (payload.type !== 'access' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException();
    }

    const [admin, session] = await Promise.all([
      this.admins.findById(payload.sub),
      this.sessions.findById(payload.sid),
    ]);

    if (
      !admin?.isActive ||
      !session ||
      session.adminId !== admin.id ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException();
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}

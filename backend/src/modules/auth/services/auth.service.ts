import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { timingSafeEqual } from 'node:crypto';
import { Admin, NewAuthSession } from '../../../database/schema';
import {
  ADMIN_REPOSITORY,
  AdminRepository,
} from '../../admins/interfaces/admin-repository.interface';
import { LoginDto } from '../dto/login.dto';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSessionRepository,
} from '../interfaces/auth-session-repository.interface';
import { AdminPrincipal, AuthenticationContext, TokenPair } from '../interfaces/auth.types';
import { TokenService } from './token.service';

const DUMMY_PASSWORD_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  admin: AdminPrincipal;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly admins: AdminRepository,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
    private readonly tokens: TokenService,
  ) {}

  async login(dto: LoginDto, context: AuthenticationContext): Promise<AuthenticationResponse> {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.admins.findByEmail(email);
    const passwordMatches = await bcrypt.compare(
      dto.password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!admin || !passwordMatches || !admin.isActive) {
      if (admin?.isActive) {
        await this.admins.recordFailedLogin(admin.id);
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.admins.recordSuccessfulLogin(admin.id);
    const tokenPair = await this.createSession(admin, context);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      admin: this.toPrincipal(admin),
    };
  }

  async refresh(
    refreshToken: string,
    context: AuthenticationContext,
  ): Promise<AuthenticationResponse> {
    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findById(payload.sid);

    if (
      !session ||
      session.adminId !== payload.sub ||
      session.tokenFamilyId !== payload.fid ||
      session.expiresAt <= new Date() ||
      !this.tokenHashesMatch(session.tokenHash, this.tokens.hashToken(refreshToken))
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.revokedAt) {
      await this.sessions.revokeFamily(session.tokenFamilyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const admin = await this.admins.findById(payload.sub);

    if (!admin?.isActive) {
      await this.sessions.revokeFamily(session.tokenFamilyId);
      throw new UnauthorizedException('Administrator account is unavailable');
    }

    const replacementSessionId = this.tokens.newIdentifier();
    const tokenPair = await this.tokens.createTokenPair(
      admin,
      replacementSessionId,
      session.tokenFamilyId,
    );
    const replacement = this.buildSession(
      admin.id,
      replacementSessionId,
      session.tokenFamilyId,
      tokenPair,
      context,
    );
    const rotated = await this.sessions.rotate(session.id, replacement);

    if (!rotated) {
      await this.sessions.revokeFamily(session.tokenFamilyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      admin: this.toPrincipal(admin),
    };
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.sessions.revokeByTokenHash(this.tokens.hashToken(refreshToken));

    return { message: 'Logged out successfully' };
  }

  private async createSession(admin: Admin, context: AuthenticationContext): Promise<TokenPair> {
    const sessionId = this.tokens.newIdentifier();
    const tokenFamilyId = this.tokens.newIdentifier();
    const tokenPair = await this.tokens.createTokenPair(admin, sessionId, tokenFamilyId);

    await this.sessions.create(
      this.buildSession(admin.id, sessionId, tokenFamilyId, tokenPair, context),
    );

    return tokenPair;
  }

  private buildSession(
    adminId: string,
    sessionId: string,
    tokenFamilyId: string,
    tokenPair: TokenPair,
    context: AuthenticationContext,
  ): NewAuthSession {
    return {
      id: sessionId,
      adminId,
      tokenFamilyId,
      tokenHash: this.tokens.hashToken(tokenPair.refreshToken),
      expiresAt: tokenPair.refreshExpiresAt,
      lastUsedAt: new Date(),
      ipHash: this.tokens.hashIpAddress(context.ipAddress),
      userAgent: context.userAgent?.slice(0, 512),
    };
  }

  private toPrincipal(admin: {
    id: string;
    email: string;
    name: string;
    role: AdminPrincipal['role'];
  }): AdminPrincipal {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }

  private tokenHashesMatch(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(actual, 'hex');

    return (
      expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}

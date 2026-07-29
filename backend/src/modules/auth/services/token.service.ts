import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Admin } from '../../../database/schema';
import { AccessTokenPayload, RefreshTokenPayload, TokenPair } from '../interfaces/auth.types';

const DURATION_PATTERN = /^(\d+)([smhd])$/;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  newIdentifier(): string {
    return randomUUID();
  }

  async createTokenPair(
    admin: Admin,
    sessionId: string,
    tokenFamilyId: string,
  ): Promise<TokenPair> {
    const accessExpiry = this.config.getOrThrow<string>('jwt.accessTokenExpiry');
    const refreshExpiry = this.config.getOrThrow<string>('jwt.refreshTokenExpiry');
    const issuer = this.config.getOrThrow<string>('jwt.issuer');
    const audience = this.config.getOrThrow<string>('jwt.audience');

    const accessPayload: AccessTokenPayload = {
      sub: admin.id,
      role: admin.role,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: admin.id,
      sid: sessionId,
      fid: tokenFamilyId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiry as JwtSignOptions['expiresIn'],
        issuer,
        audience,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiry as JwtSignOptions['expiresIn'],
        issuer,
        audience,
      }),
    ]);

    const refreshDurationSeconds = this.durationToSeconds(refreshExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.durationToSeconds(accessExpiry),
      refreshExpiresAt: new Date(Date.now() + refreshDurationSeconds * 1_000),
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        issuer: this.config.getOrThrow<string>('jwt.issuer'),
        audience: this.config.getOrThrow<string>('jwt.audience'),
      });

      if (payload.type !== 'refresh' || !payload.sub || !payload.sid || !payload.fid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  hashIpAddress(ipAddress: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('jwt.ipHashSecret'))
      .update(ipAddress)
      .digest('hex');
  }

  private durationToSeconds(duration: string): number {
    const match = DURATION_PATTERN.exec(duration);

    if (!match) {
      throw new Error(`Invalid token duration "${duration}". Use values such as 15m, 1h, or 7d.`);
    }

    const amount = Number(match[1]);
    const multiplier = {
      s: 1,
      m: 60,
      h: 3_600,
      d: 86_400,
    }[match[2]];

    return amount * multiplier;
  }
}

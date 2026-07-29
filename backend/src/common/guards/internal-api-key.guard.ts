import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const suppliedKey = request.headers['x-internal-api-key'];
    const expectedKey = this.config.getOrThrow<string>('app.internalApiKey');

    if (typeof suppliedKey !== 'string' || !this.keysMatch(suppliedKey, expectedKey)) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }

  private keysMatch(supplied: string, expected: string): boolean {
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);

    return (
      suppliedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(suppliedBuffer, expectedBuffer)
    );
  }
}

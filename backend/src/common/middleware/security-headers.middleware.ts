import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(request: IncomingMessage, response: ServerResponse, next: () => void): void {
    const requestId = this.requestId(request.headers['x-request-id']);
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const isDocumentation = request.url?.startsWith('/api/v1/docs');
    response.setHeader(
      'Content-Security-Policy',
      isDocumentation
        ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'"
        : "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    );
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader('Cache-Control', 'no-store');
    if (this.config.get<string>('app.env') === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  }

  private requestId(value: string | string[] | undefined): string {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate && /^[a-zA-Z0-9._-]{8,100}$/.test(candidate) ? candidate : randomUUID();
  }
}

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable, finalize } from 'rxjs';
import { safeRequestPath } from '../logging/safe-request-path';

@Injectable()
export class SecureLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private slowWindowStartedAt = 0;
  private slowRequestCount = 0;
  private slowRequestMaxMs = 0;

  constructor(
    private readonly successSampleRate = 1,
    private readonly slowRequestMs = 750,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startedAt = Date.now();
    const path = safeRequestPath(request);
    const sampled = Math.random() < this.successSampleRate;
    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        if (durationMs >= this.slowRequestMs) {
          this.recordSlowRequest(request.method, path, durationMs);
        } else if (sampled) {
          this.logger.log(`${request.method} ${path} completed in ${durationMs}ms`);
        }
      }),
    );
  }

  private recordSlowRequest(method: string, path: string, durationMs: number): void {
    const now = Date.now();
    if (this.slowWindowStartedAt === 0) this.slowWindowStartedAt = now;
    this.slowRequestCount += 1;
    this.slowRequestMaxMs = Math.max(this.slowRequestMaxMs, durationMs);
    const windowMs = now - this.slowWindowStartedAt;
    if (windowMs < 1_000) return;

    this.logger.warn(
      `Slow HTTP requests windowMs=${windowMs} count=${this.slowRequestCount} maxDurationMs=${this.slowRequestMaxMs} latest=${method} ${path}`,
    );
    this.slowWindowStartedAt = now;
    this.slowRequestCount = 0;
    this.slowRequestMaxMs = 0;
  }
}

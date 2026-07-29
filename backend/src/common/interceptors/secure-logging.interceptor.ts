import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable, finalize } from 'rxjs';

@Injectable()
export class SecureLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startedAt = Date.now();
    const path = request.url.split('?')[0];
    return next
      .handle()
      .pipe(
        finalize(() =>
          this.logger.log(`${request.method} ${path} completed in ${Date.now() - startedAt}ms`),
        ),
      );
  }
}

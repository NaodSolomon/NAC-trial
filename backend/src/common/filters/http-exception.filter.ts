import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ValidationErrorResponse {
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const response =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const details =
      typeof response === 'object' && response !== null
        ? (response as ValidationErrorResponse)
        : undefined;
    const message =
      details?.message ?? (typeof response === 'string' ? response : 'Request failed');

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} failed with ${statusCode}`, stack);
    }

    reply.status(statusCode).send({
      success: false,
      statusCode,
      message,
      error: details?.error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

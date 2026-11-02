import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { LoggerService } from '../../core/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { TenantContext } from '../../core/tenant-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Inject requestId
    const requestId = uuidv4();
    (request as any).requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const tenantId = TenantContext.getTenantId();

          this.logger.logRequest(requestId, method, url, statusCode, duration, tenantId);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} failed after ${duration}ms: ${error.message}`,
            error.stack,
            'HTTP',
          );
        },
      }),
    );
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditService } from './audit.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const action = this.urlToAction(method, url);
    const resourceType = this.urlToResourceType(url);
    const resourceId = this.extractIdFromUrl(url);

    return next.handle().pipe(
      tap({
        next: (result: any) => {
          this.auditService.log({
            action,
            resourceType,
            resourceId,
            newValues: method !== 'DELETE' && result?.data ? result.data : undefined,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            requestId: (request as any).requestId,
          });
        },
      }),
    );
  }

  private urlToAction(method: string, _url: string): string {
    const map: Record<string, string> = {
      POST: 'created',
      PUT: 'updated',
      PATCH: 'updated',
      DELETE: 'deleted',
    };
    return map[method] || method.toLowerCase();
  }

  private urlToResourceType(url: string): string {
    // e.g., /api/v1/subscribers/abc → subscribers
    const parts = url.split('/').filter(Boolean);
    const versionIdx = parts.findIndex((p) => p.startsWith('v'));
    return parts[versionIdx + 1] || 'unknown';
  }

  private extractIdFromUrl(url: string): string | undefined {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = url.match(uuidRegex);
    return match?.[0];
  }
}

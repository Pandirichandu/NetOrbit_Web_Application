import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric('active_tenants_total')
    private readonly activeTenants: Gauge<string>,
  ) {}

  incrementHttpRequests(method: string, path: string, statusCode: string): void {
    this.httpRequestsTotal.inc({ method, path, status_code: statusCode });
  }

  observeHttpDuration(method: string, path: string, durationSeconds: number): void {
    this.httpRequestDuration.observe({ method, path }, durationSeconds);
  }

  setActiveTenants(count: number): void {
    this.activeTenants.set(count);
  }
}

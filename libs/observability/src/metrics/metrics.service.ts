import { Injectable } from '@nestjs/common';
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP Metrics
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;

  // Business Metrics
  private readonly urlsCreatedTotal: Counter<string>;
  private readonly urlClicksTotal: Counter<string>;
  private readonly activeUsersTotal: Gauge<string>;

  // System Metrics
  private readonly databaseConnectionsTotal: Gauge<string>;

  constructor() {
    // Enable collection of default metrics
    collectDefaultMetrics();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'service'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // Business Metrics
    this.urlsCreatedTotal = new Counter({
      name: 'urls_created_total',
      help: 'Total number of URLs created',
      labelNames: ['user_type', 'service'],
    });

    this.urlClicksTotal = new Counter({
      name: 'url_clicks_total',
      help: 'Total number of URL clicks',
      labelNames: ['service'],
    });

    this.activeUsersTotal = new Gauge({
      name: 'active_users_total',
      help: 'Number of active users',
      labelNames: ['service'],
    });

    // System Metrics
    this.databaseConnectionsTotal = new Gauge({
      name: 'database_connections_total',
      help: 'Number of database connections',
      labelNames: ['status', 'service'],
    });
  }

  // HTTP Metrics Methods
  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: number,
    service: string,
  ) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      service,
    });
  }

  observeHttpDuration(
    method: string,
    route: string,
    service: string,
    duration: number,
  ) {
    this.httpRequestDuration.observe(
      { method, route, service },
      duration / 1000, // Convert ms to seconds
    );
  }

  // Business Metrics Methods
  incrementUrlCreated(
    userType: 'authenticated' | 'anonymous',
    service: string,
  ) {
    this.urlsCreatedTotal.inc({ user_type: userType, service });
  }

  incrementUrlClick(service: string) {
    this.urlClicksTotal.inc({ service });
  }

  setActiveUsers(count: number, service: string) {
    this.activeUsersTotal.set({ service }, count);
  }

  // System Metrics Methods
  setDatabaseConnections(
    count: number,
    status: 'active' | 'idle',
    service: string,
  ) {
    this.databaseConnectionsTotal.set({ status, service }, count);
  }

  // Get metrics for /metrics endpoint
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Health check metrics
  setHealthStatus(service: string, status: 'healthy' | 'unhealthy') {
    const healthGauge = new Gauge({
      name: `service_health_status`,
      help: 'Health status of services (1 = healthy, 0 = unhealthy)',
      labelNames: ['service'],
    });

    healthGauge.set({ service }, status === 'healthy' ? 1 : 0);
  }
}

import { Controller, Get, Header } from '@nestjs/common';
import * as promClient from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    // Returns dynamic metrics from Prometheus
    return await promClient.register.metrics();
  }
}

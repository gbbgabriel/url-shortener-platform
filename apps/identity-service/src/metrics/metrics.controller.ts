import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from '@app/observability';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    // Retorna métricas dinâmicas do Prometheus via biblioteca observability
    return await this.metricsService.getMetrics();
  }
}

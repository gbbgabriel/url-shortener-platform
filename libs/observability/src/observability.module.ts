import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';

@Global()
@Module({
  providers: [LoggerService, MetricsService],
  exports: [LoggerService, MetricsService],
})
export class ObservabilityModule {}

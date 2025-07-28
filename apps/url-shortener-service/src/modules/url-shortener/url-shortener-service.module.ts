import { Module } from '@nestjs/common';
import { UrlShortenerServiceController } from './controllers/url-shortener-service.controller';
import { MetricsController } from './controllers/metrics.controller';
import { UrlShortenerServiceService } from './services/url-shortener-service.service';
import { PrismaModule } from '@app/prisma';
import { ObservabilityModule } from '@app/observability';

@Module({
  imports: [PrismaModule, ObservabilityModule],
  controllers: [UrlShortenerServiceController, MetricsController],
  providers: [UrlShortenerServiceService],
})
export class UrlShortenerServiceModule {}

import { Module } from '@nestjs/common';
import { UrlShortenerServiceController } from './controllers/url-shortener-service.controller';
import { UrlShortenerServiceService } from './services/url-shortener-service.service';
import { PrismaModule } from '@app/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [UrlShortenerServiceController],
  providers: [UrlShortenerServiceService],
})
export class UrlShortenerServiceModule {}

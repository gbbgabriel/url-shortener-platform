import { Controller, Get } from '@nestjs/common';
import { UrlShortenerServiceService } from './url-shortener-service.service';

@Controller()
export class UrlShortenerServiceController {
  constructor(private readonly urlShortenerServiceService: UrlShortenerServiceService) {}

  @Get()
  getHello(): string {
    return this.urlShortenerServiceService.getHello();
  }
}

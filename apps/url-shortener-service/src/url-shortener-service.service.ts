import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlShortenerServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}

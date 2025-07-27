import { Test, TestingModule } from '@nestjs/testing';
import { UrlShortenerServiceController } from './url-shortener-service.controller';
import { UrlShortenerServiceService } from './url-shortener-service.service';

describe('UrlShortenerServiceController', () => {
  let urlShortenerServiceController: UrlShortenerServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerServiceController],
      providers: [UrlShortenerServiceService],
    }).compile();

    urlShortenerServiceController = app.get<UrlShortenerServiceController>(UrlShortenerServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(urlShortenerServiceController.getHello()).toBe('Hello World!');
    });
  });
});

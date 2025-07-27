import { NestFactory } from '@nestjs/core';
import { UrlShortenerServiceModule } from './url-shortener-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UrlShortenerServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();

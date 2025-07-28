import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { UrlShortenerServiceModule } from './modules/url-shortener/url-shortener-service.module';
import { join } from 'path';

async function bootstrap() {
  try {
    console.log('🚀 Starting URL Shortener Service...');

    const app = await NestFactory.create<NestFastifyApplication>(
      UrlShortenerServiceModule,
      new FastifyAdapter(),
    );

    console.log('✅ NestJS application created');

    // Configurar validação global
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    console.log('✅ Global validation configured');

    // Configurar CORS básico
    await app.register(import('@fastify/cors'), {
      origin: true,
    });

    console.log('✅ CORS configured');

    // Configurar static files para Swagger
    await app.register(import('@fastify/static'), {
      root: join(process.cwd(), 'node_modules/swagger-ui-dist'),
      prefix: '/docs/',
    });

    console.log('✅ Static files configured');

    // Configurar Swagger/OpenAPI de forma PADRÃO
    const config = new DocumentBuilder()
      .setTitle('URL Shortener API')
      .setDescription(
        'API para encurtamento de URLs - Release 0.3.0: User URL Management',
      )
      .setVersion('0.3.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    console.log('✅ Swagger configured');

    const port = process.env.PORT || 3002;
    await app.listen(port, '0.0.0.0');

    console.log(`🎯 Application is running on: http://localhost:${port}`);
    console.log(
      `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
    );
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

void bootstrap();

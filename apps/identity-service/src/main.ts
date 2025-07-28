import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Identity Service API')
    .setDescription('Authentication and User Management Service')
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, reply) => {
    reply.send({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'identity-service',
      version: '0.2.0',
    });
  });

  console.log('🔐 Starting Identity Service...');
  await app.listen(3001, '0.0.0.0');
  console.log('🎯 Identity Service is running on: http://localhost:3001');
  console.log('📚 Swagger docs available at: http://localhost:3001/api/docs');
}

void bootstrap();

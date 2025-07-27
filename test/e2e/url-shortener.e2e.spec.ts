import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { UrlShortenerServiceModule } from '../../apps/url-shortener-service/src/modules/url-shortener/url-shortener-service.module';
import { testDb } from '../setup/e2e.setup';
import { PrismaService } from '@app/prisma';
import {
  CreateUrlResponse,
  UrlInfoResponse,
  HealthResponse,
  ErrorResponse,
} from '../../apps/url-shortener-service/src/common/types/test-responses';

describe('URL Shortener API - End-to-End Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UrlShortenerServiceModule],
    })
      .overrideProvider(PrismaService)
      .useValue(testDb)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(import('@fastify/cors'), {
      origin: true,
    });

    await app.listen(0); // Porta aleatória para evitar conflitos
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check (GET /health)', () => {
    it('should return service health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.payload) as HealthResponse;
      expect(data).toMatchObject({
        status: 'OK',
        service: 'url-shortener-service',
        version: '0.1.0',
      });
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('URL Shortening (POST /shorten)', () => {
    it('should create short URL for valid URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: {
          originalUrl: 'https://www.google.com',
        },
      });

      expect(response.statusCode).toBe(201);

      const data = JSON.parse(response.payload) as CreateUrlResponse;
      expect(data.shortCode).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(data.originalUrl).toBe('https://www.google.com');
      expect(data.shortUrl).toContain(data.shortCode);
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert("xss")',
        '',
        'http://',
      ];

      for (const url of invalidUrls) {
        const response = await app.inject({
          method: 'POST',
          url: '/shorten',
          payload: {
            originalUrl: url,
          },
        });

        expect(response.statusCode).toBe(400);
      }
    });

    it('should handle missing payload gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('URL Redirection (GET /:shortCode)', () => {
    it('should redirect to original URL and track clicks', async () => {
      // Primeiro, criar uma URL
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: {
          originalUrl: 'https://example.com/redirect-test',
        },
      });

      const createData = JSON.parse(
        createResponse.payload,
      ) as CreateUrlResponse;
      const shortCode = createData.shortCode;

      // Fazer o redirecionamento
      const redirectResponse = await app.inject({
        method: 'GET',
        url: `/${shortCode}`,
      });

      expect(redirectResponse.statusCode).toBe(302);
      expect(redirectResponse.headers.location).toBe(
        'https://example.com/redirect-test',
      );

      // Aguardar um pouco para processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verificar se o clique foi registrado
      const infoResponse = await app.inject({
        method: 'GET',
        url: `/info/${shortCode}`,
      });

      const infoData = JSON.parse(infoResponse.payload) as UrlInfoResponse;
      expect(infoData.clickCount).toBe(1);
    });

    it('should handle multiple concurrent redirects correctly', async () => {
      // Criar uma URL para teste
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: {
          originalUrl: 'https://example.com/concurrent-redirect-test',
        },
      });

      const createData = JSON.parse(
        createResponse.payload,
      ) as CreateUrlResponse;
      const shortCode = createData.shortCode;

      // Fazer múltiplos redirecionamentos simultâneos
      const redirectPromises = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'GET',
          url: `/${shortCode}`,
        }),
      );

      const responses = await Promise.all(redirectPromises);

      // Todos devem ser redirecionamentos válidos
      responses.forEach((response) => {
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe(
          'https://example.com/concurrent-redirect-test',
        );
      });

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verificar se todos os cliques foram registrados
      const infoResponse = await app.inject({
        method: 'GET',
        url: `/info/${shortCode}`,
      });

      const infoData = JSON.parse(infoResponse.payload) as UrlInfoResponse;
      expect(infoData.clickCount).toBe(5);
    });

    it('should return 404 for non-existent short codes', async () => {
      const nonExistentCodes = ['NOTFND', '123456', 'ABCDEF'];

      for (const code of nonExistentCodes) {
        const response = await app.inject({
          method: 'GET',
          url: `/${code}`,
        });

        expect(response.statusCode).toBe(404);
      }
    });
  });

  describe('URL Information (GET /info/:shortCode)', () => {
    it('should return detailed URL information', async () => {
      // Criar uma URL
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: {
          originalUrl: 'https://example.com/info-test',
        },
      });

      const createData = JSON.parse(
        createResponse.payload,
      ) as CreateUrlResponse;
      const shortCode = createData.shortCode;

      // Fazer alguns cliques
      await app.inject({ method: 'GET', url: `/${shortCode}` });
      await app.inject({ method: 'GET', url: `/${shortCode}` });

      // Aguardar processamento
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Obter informações
      const infoResponse = await app.inject({
        method: 'GET',
        url: `/info/${shortCode}`,
      });

      expect(infoResponse.statusCode).toBe(200);

      const data = JSON.parse(infoResponse.payload) as UrlInfoResponse;
      expect(data.shortCode).toBe(shortCode);
      expect(data.originalUrl).toBe('https://example.com/info-test');
      expect(data.clickCount).toBe(2);
      expect(data.shortUrl).toContain(shortCode);
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
    });

    it('should return 404 for non-existent short codes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/info/NOTFND',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle a complete user journey', async () => {
      const originalUrl = 'https://docs.nestjs.com/techniques/database';

      // 1. Usuário encurta uma URL
      const createResponse = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: { originalUrl },
      });

      expect(createResponse.statusCode).toBe(201);
      const { shortCode } = JSON.parse(
        createResponse.payload,
      ) as CreateUrlResponse;

      // 2. Usuário compartilha e pessoas clicam várias vezes
      const clickPromises = Array.from({ length: 8 }, () =>
        app.inject({ method: 'GET', url: `/${shortCode}` }),
      );

      const clickResponses = await Promise.all(clickPromises);
      clickResponses.forEach((response) => {
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe(originalUrl);
      });

      // 3. Usuário verifica as estatísticas
      await new Promise((resolve) => setTimeout(resolve, 300));

      const statsResponse = await app.inject({
        method: 'GET',
        url: `/info/${shortCode}`,
      });

      expect(statsResponse.statusCode).toBe(200);
      const stats = JSON.parse(statsResponse.payload) as UrlInfoResponse;
      expect(stats.clickCount).toBe(8);
      expect(stats.originalUrl).toBe(originalUrl);
    });

    it('should handle burst traffic patterns', async () => {
      // Simular um pico de tráfego (viral link)
      const urls = Array.from(
        { length: 20 },
        (_, i) => `https://example.com/viral-content-${i}`,
      );

      const startTime = Date.now();

      // Criar múltiplas URLs rapidamente
      const createPromises = urls.map((url) =>
        app.inject({
          method: 'POST',
          url: '/shorten',
          payload: { originalUrl: url },
        }),
      );

      const createResponses = await Promise.all(createPromises);

      // Todas devem ser criadas com sucesso
      createResponses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance: não deve demorar mais que 3 segundos
      expect(duration).toBeLessThan(3000);

      // Extrair shortCodes e fazer redirecionamentos
      const shortCodes = createResponses.map((response) => {
        const data = JSON.parse(response.payload) as CreateUrlResponse;
        return data.shortCode;
      });

      // Simular cliques em todas as URLs
      const clickPromises = shortCodes.flatMap((code) =>
        Array.from({ length: 3 }, () =>
          app.inject({ method: 'GET', url: `/${code}` }),
        ),
      );

      const clickResponses = await Promise.all(clickPromises);

      // Todos os redirecionamentos devem funcionar
      expect(clickResponses).toHaveLength(60); // 20 URLs × 3 cliques
      clickResponses.forEach((response) => {
        expect(response.statusCode).toBe(302);
      });
    });

    it('should handle edge case URLs that users might try', async () => {
      const edgeCaseUrls = [
        'https://example.com/path/with/many/segments/that/could/be/problematic',
        'https://api.example.com/v1/search?q=test+query&filters[]=type:video&filters[]=duration:long',
        'https://shop.example.com/category/electronics?sort=price&order=asc&page=5#product-grid',
      ];

      for (const url of edgeCaseUrls) {
        // Criar URL
        const createResponse = await app.inject({
          method: 'POST',
          url: '/shorten',
          payload: { originalUrl: url },
        });

        expect(createResponse.statusCode).toBe(201);
        const { shortCode } = JSON.parse(
          createResponse.payload,
        ) as CreateUrlResponse;

        // Testar redirecionamento
        const redirectResponse = await app.inject({
          method: 'GET',
          url: `/${shortCode}`,
        });

        expect(redirectResponse.statusCode).toBe(302);
        expect(redirectResponse.headers.location).toBe(url);

        // Testar info
        const infoResponse = await app.inject({
          method: 'GET',
          url: `/info/${shortCode}`,
        });

        expect(infoResponse.statusCode).toBe(200);
        const info = JSON.parse(infoResponse.payload) as UrlInfoResponse;
        expect(info.originalUrl).toBe(url);
      }
    });
  });

  describe('API Contract and Error Handling', () => {
    it('should return consistent error format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/info/INVALID',
      });

      expect(response.statusCode).toBe(404);

      const error = JSON.parse(response.payload) as ErrorResponse;
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode', 404);
    });

    it('should handle invalid HTTP methods gracefully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/shorten',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate Content-Type for POST requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shorten',
        payload: 'not-json',
        headers: {
          'content-type': 'text/plain',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

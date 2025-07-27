import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UrlShortenerServiceService } from '../../apps/url-shortener-service/src/modules/url-shortener/services/url-shortener-service.service';
import { PrismaService } from '@app/prisma';
import { testDb } from '../setup/integration.setup';
import { CreateUrlResponse } from '../../apps/url-shortener-service/src/common/types/test-responses';

describe('URL Shortener Service - Integration Tests', () => {
  let service: UrlShortenerServiceService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerServiceService,
        {
          provide: PrismaService,
          useValue: testDb,
        },
      ],
    }).compile();

    service = module.get<UrlShortenerServiceService>(
      UrlShortenerServiceService,
    );
  });

  describe('Real-world URL shortening scenarios', () => {
    it('should handle popular websites correctly', async () => {
      const popularUrls = [
        'https://www.google.com',
        'https://github.com/nestjs/nest',
        'https://stackoverflow.com/questions/tagged/typescript',
        'https://docs.nestjs.com/techniques/database',
      ];

      const results: CreateUrlResponse[] = [];
      for (const url of popularUrls) {
        const result = await service.shortenUrl(url);
        results.push(result);

        expect(result.shortCode).toHaveLength(6);
        expect(result.originalUrl).toBe(url);
        expect(result.shortUrl).toContain(result.shortCode);
      }

      // Verificar que todos os códigos são únicos
      const shortCodes = results.map((r) => r.shortCode);
      const uniqueCodes = new Set(shortCodes);
      expect(uniqueCodes.size).toBe(shortCodes.length);
    });

    it('should reject malformed URLs that could cause security issues', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://internal.server/secrets',
        'http://localhost:22/ssh',
      ];

      for (const url of maliciousUrls) {
        await expect(service.shortenUrl(url)).rejects.toThrow('Invalid URL');
      }
    });
  });

  describe('Database persistence and consistency', () => {
    it('should handle click tracking accurately under concurrent access', async () => {
      const url = 'https://example.com/concurrent-test';
      const result = await service.shortenUrl(url);

      // Simular múltiplos cliques simultâneos
      const clickPromises = Array.from({ length: 10 }, () =>
        service.redirect(result.shortCode),
      );

      const redirectResults = await Promise.all(clickPromises);

      // Todos devem retornar a URL original
      redirectResults.forEach((redirectUrl) => {
        expect(redirectUrl).toBe(url);
      });

      // Aguardar processamento assíncrono
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar se o contador foi atualizado
      const urlInfo = await service.getUrlInfo(result.shortCode);
      expect(urlInfo.clickCount).toBe(10);
    });
  });

  describe('Edge cases that happen in production', () => {
    it('should handle rapid sequential URL creation', async () => {
      const baseUrl = 'https://example.com/rapid-test-';
      const urls = Array.from({ length: 20 }, (_, i) => `${baseUrl}${i}`);

      const startTime = Date.now();
      const results: CreateUrlResponse[] = [];

      for (const url of urls) {
        const result = await service.shortenUrl(url);
        results.push(result);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verificar que todas as URLs foram processadas
      expect(results).toHaveLength(20);

      // Verificar que todos os códigos são únicos
      const shortCodes = results.map((r) => r.shortCode);
      const uniqueCodes = new Set(shortCodes);
      expect(uniqueCodes.size).toBe(20);

      // Performance básica
      expect(duration).toBeLessThan(5000);
    });

    it('should gracefully handle non-existent shortCode lookups', async () => {
      const nonExistentCodes = ['NOTFND', '123456', 'xxxxxx'];

      for (const code of nonExistentCodes) {
        await expect(service.redirect(code)).rejects.toThrow(NotFoundException);
        await expect(service.getUrlInfo(code)).rejects.toThrow(
          NotFoundException,
        );
      }
    });
  });
});

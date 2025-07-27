/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UrlShortenerServiceModule } from './../src/modules/url-shortener/url-shortener-service.module';
import { PrismaService } from '@app/prisma';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

interface ShortenResponse {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
}

interface UrlInfoResponse {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  shortUrl: string;
}

describe('UrlShortenerServiceController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockPrismaService = {
    shortUrl: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    urlClick: {
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UrlShortenerServiceModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as HealthResponse;
          expect(body.status).toBe('OK');
          expect(body.service).toBe('url-shortener-service');
          expect(body.version).toBe('0.1.0');
          expect(body.timestamp).toBeDefined();
        });
    });
  });

  describe('/shorten (POST)', () => {
    it('should create a short URL', () => {
      const originalUrl = 'https://example.com/very/long/url';
      const mockShortUrl = {
        shortCode: 'abc123',
        originalUrl,
        id: 'uuid-123',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockShortUrl);

      return request(app.getHttpServer())
        .post('/shorten')
        .send({ originalUrl })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ShortenResponse;
          expect(body.shortCode).toBeDefined();
          expect(body.originalUrl).toBe(originalUrl);
          expect(body.shortUrl).toContain(body.shortCode);
        });
    });

    it('should return 400 for invalid URL', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({ originalUrl: 'invalid-url' })
        .expect(400);
    });

    it('should return 400 for missing URL', () => {
      return request(app.getHttpServer()).post('/shorten').send({}).expect(400);
    });
  });

  describe('/info/:shortCode (GET)', () => {
    it('should return URL info', () => {
      const shortCode = 'abc123';
      const mockShortUrl = {
        shortCode,
        originalUrl: 'https://example.com',
        clickCount: 5,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      mockPrismaService.shortUrl.findFirst.mockResolvedValue(mockShortUrl);

    return request(app.getHttpServer())
        .get(`/info/${shortCode}`)
      .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as UrlInfoResponse;
          expect(body.shortCode).toBe(shortCode);
          expect(body.originalUrl).toBe('https://example.com');
          expect(body.clickCount).toBe(5);
          expect(body.shortUrl).toContain(shortCode);
        });
    });

    it('should return 404 for non-existent URL', () => {
      const shortCode = 'nonexistent';
      mockPrismaService.shortUrl.findFirst.mockResolvedValue(null);

      return request(app.getHttpServer()).get(`/info/${shortCode}`).expect(404);
    });
  });

  describe('/:shortCode (GET)', () => {
    it('should redirect to original URL', () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      const mockShortUrl = {
        id: 'uuid-123',
        originalUrl,
        clickCount: 5,
      };

      mockPrismaService.shortUrl.findFirst.mockResolvedValue(mockShortUrl);
      mockPrismaService.urlClick.create.mockResolvedValue({});
      mockPrismaService.shortUrl.update.mockResolvedValue({});

      return request(app.getHttpServer())
        .get(`/${shortCode}`)
        .expect(301)
        .expect((res: request.Response) => {
          expect(res.headers.location).toBe(originalUrl);
        });
    });

    it('should return 404 for non-existent short code', () => {
      const shortCode = 'nonexistent';
      mockPrismaService.shortUrl.findFirst.mockResolvedValue(null);

      return request(app.getHttpServer()).get(`/${shortCode}`).expect(404);
    });
  });

  describe('Application', () => {
    it('should be defined', () => {
      expect(app).toBeDefined();
    });

    it('should have PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });
});

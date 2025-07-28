import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UrlShortenerServiceService } from './url-shortener-service.service';
import { PrismaService } from '@app/prisma';

// Mock do módulo url-utils
jest.mock('../../../common/utils/url-utils', () => ({
  isValidUrl: jest.fn(),
  generateRandomCode: jest.fn(),
}));

// Import das funções mockadas
import {
  isValidUrl,
  generateRandomCode,
} from '../../../common/utils/url-utils';

describe('UrlShortenerServiceService', () => {
  let service: UrlShortenerServiceService;

  // Mock functions com tipos corretos
  const mockIsValidUrl = isValidUrl as jest.MockedFunction<typeof isValidUrl>;
  const mockGenerateRandomCode = generateRandomCode as jest.MockedFunction<
    typeof generateRandomCode
  >;

  const mockPrismaService = {
    shortUrl: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    urlClick: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockShortUrl = {
    id: 'shorturl-uuid-123',
    shortCode: 'abc123',
    originalUrl: 'https://example.com',
    clickCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerServiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UrlShortenerServiceService>(
      UrlShortenerServiceService,
    );

    // Configurar variável de ambiente para testes
    process.env.REDIRECT_BASE_URL = 'http://localhost:3002';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIRECT_BASE_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shortenUrl', () => {
    const validUrl = 'https://example.com/long/url';

    it('should create short URL successfully', async () => {
      mockIsValidUrl.mockReturnValue(true);
      mockGenerateRandomCode.mockReturnValue('abc123');
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue({
        ...mockShortUrl,
        originalUrl: validUrl,
      });

      const result = await service.shortenUrl(validUrl);

      expect(result).toEqual({
        shortCode: 'abc123',
        shortUrl: 'http://localhost:3002/abc123',
        originalUrl: validUrl,
      });
      expect(mockIsValidUrl).toHaveBeenCalledWith(validUrl);
      expect(mockPrismaService.shortUrl.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc123',
          originalUrl: validUrl,
        },
      });
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const invalidUrl = 'not-a-valid-url';
      mockIsValidUrl.mockReturnValue(false);

      await expect(service.shortenUrl(invalidUrl)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockIsValidUrl).toHaveBeenCalledWith(invalidUrl);
      expect(mockPrismaService.shortUrl.create).not.toHaveBeenCalled();
    });

    it('should generate unique code after collision', async () => {
      mockIsValidUrl.mockReturnValue(true);
      mockGenerateRandomCode
        .mockReturnValueOnce('collision') // First attempt - collision
        .mockReturnValueOnce('abc123'); // Second attempt - success

      mockPrismaService.shortUrl.findUnique
        .mockResolvedValueOnce(mockShortUrl) // First code exists
        .mockResolvedValueOnce(null); // Second code is unique

      mockPrismaService.shortUrl.create.mockResolvedValue({
        ...mockShortUrl,
        shortCode: 'abc123',
      });

      const result = await service.shortenUrl(validUrl);

      expect(result.shortCode).toBe('abc123');
      expect(mockGenerateRandomCode).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should throw error when cannot generate unique code after max attempts', async () => {
      mockIsValidUrl.mockReturnValue(true);
      mockGenerateRandomCode.mockReturnValue('collision');
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);

      await expect(service.shortenUrl(validUrl)).rejects.toThrow(
        'Could not generate unique code',
      );
      expect(mockGenerateRandomCode).toHaveBeenCalledTimes(5); // Max attempts
    });

    it('should use default base URL when env var not set', async () => {
      delete process.env.REDIRECT_BASE_URL;

      mockIsValidUrl.mockReturnValue(true);
      mockGenerateRandomCode.mockReturnValue('abc123');
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockShortUrl);

      const result = await service.shortenUrl(validUrl);

      expect(result.shortUrl).toBe('http://localhost:3002/abc123');
    });
  });

  describe('redirect', () => {
    const shortCode = 'abc123';

    it('should redirect successfully and record click', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);

      // Mock da transação tipado corretamente
      interface MockTransactionClient {
        shortUrl: {
          findUniqueOrThrow: jest.Mock;
          update: jest.Mock;
        };
        urlClick: {
          create: jest.Mock;
        };
      }

      const mockTransaction = jest
        .fn()
        .mockImplementation(
          async (
            callback: (client: MockTransactionClient) => Promise<void>,
          ) => {
            const mockClient: MockTransactionClient = {
              shortUrl: {
                findUniqueOrThrow: jest
                  .fn()
                  .mockResolvedValue({ id: mockShortUrl.id }),
                update: jest.fn().mockResolvedValue({}),
              },
              urlClick: {
                create: jest.fn().mockResolvedValue({}),
              },
            };
            return await callback(mockClient);
          },
        );
      mockPrismaService.$transaction.mockImplementation(mockTransaction);

      const result = await service.redirect(shortCode);

      expect(result).toBe(mockShortUrl.originalUrl);
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { shortCode },
      });
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.redirect(shortCode)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { shortCode },
      });
    });

    it('should return URL even if click recording fails silently', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);

      // Mock da transação que falha
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      // Spy no console.error para verificar se o erro foi logado
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.redirect(shortCode);

      expect(result).toBe(mockShortUrl.originalUrl);

      // Aguardar um pouco para a operação assíncrona completar
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error recording click:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getUrlInfo', () => {
    const shortCode = 'abc123';

    it('should return URL info successfully', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);

      const result = await service.getUrlInfo(shortCode);

      expect(result).toEqual({
        shortCode: mockShortUrl.shortCode,
        originalUrl: mockShortUrl.originalUrl,
        clickCount: mockShortUrl.clickCount,
        createdAt: mockShortUrl.createdAt,
        updatedAt: mockShortUrl.updatedAt,
        shortUrl: 'http://localhost:3002/abc123',
      });
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { shortCode },
      });
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.getUrlInfo(shortCode)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { shortCode },
      });
    });

    it('should use default base URL when env var not set', async () => {
      delete process.env.REDIRECT_BASE_URL;

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);

      const result = await service.getUrlInfo(shortCode);

      expect(result.shortUrl).toBe('http://localhost:3002/abc123');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { MetricsService } from '@app/observability';
import { UrlShortenerServiceService } from './url-shortener-service.service';

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
      findMany: jest.fn(),
    },
    urlClick: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMetricsService = {
    incrementUrlCreated: jest.fn(),
    incrementUrlClick: jest.fn(),
    incrementHttpRequests: jest.fn(),
    observeHttpDuration: jest.fn(),
  };

  const mockShortUrl = {
    id: 'shorturl-uuid-123',
    shortCode: 'abc123',
    originalUrl: 'https://example.com',
    clickCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    userId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerServiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
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
          userId: null,
        },
      });
    });

    it('should create short URL for authenticated user', async () => {
      const userId = 'user-123';
      mockIsValidUrl.mockReturnValue(true);
      mockGenerateRandomCode.mockReturnValue('def456');
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue({
        ...mockShortUrl,
        shortCode: 'def456',
        originalUrl: validUrl,
        userId,
      });

      const result = await service.shortenUrl(validUrl, userId);

      expect(result).toEqual({
        shortCode: 'def456',
        shortUrl: 'http://localhost:3002/def456',
        originalUrl: validUrl,
      });
      expect(mockPrismaService.shortUrl.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'def456',
          originalUrl: validUrl,
          userId,
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
  });

  describe('redirect', () => {
    const shortCode = 'abc123';

    it('should redirect successfully and record click', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockShortUrl);
      mockPrismaService.shortUrl.update.mockResolvedValue({});

      const result = await service.redirect(shortCode);

      expect(result).toBe(mockShortUrl.originalUrl);
      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { shortCode, deletedAt: null },
      });
      expect(mockMetricsService.incrementUrlClick).toHaveBeenCalledWith(
        'url-shortener',
      );
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.redirect(shortCode)).rejects.toThrow(
        NotFoundException,
      );
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
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.getUrlInfo(shortCode)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserUrls', () => {
    it('should return all URLs for a specific user', async () => {
      const userId = 'user-123';
      const mockUrls = [
        {
          id: 'url-1',
          shortCode: 'abc123',
          originalUrl: 'https://github.com/url1',
          clickCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'url-2',
          shortCode: 'def456',
          originalUrl: 'https://github.com/url2',
          clickCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.shortUrl.findMany.mockResolvedValue(mockUrls);

      const result = await service.getUserUrls(userId);

      expect(mockPrismaService.shortUrl.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          clickCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].shortUrl).toBe('http://localhost:3002/abc123');
      expect(result[1].shortUrl).toBe('http://localhost:3002/def456');
    });

    it('should return empty array when user has no URLs', async () => {
      const userId = 'user-no-urls';

      mockPrismaService.shortUrl.findMany.mockResolvedValue([]);

      const result = await service.getUserUrls(userId);

      expect(result).toEqual([]);
    });
  });

  describe('updateUserUrl', () => {
    it('should update URL when it belongs to the user', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';
      const newOriginalUrl = 'https://github.com/updated';

      const existingUrl = {
        id: urlId,
        userId,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/old',
        clickCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const updatedUrl = {
        ...existingUrl,
        originalUrl: newOriginalUrl,
        updatedAt: new Date(),
      };

      mockIsValidUrl.mockReturnValue(true);
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(existingUrl);
      mockPrismaService.shortUrl.update.mockResolvedValue(updatedUrl);

      const result = await service.updateUserUrl(userId, urlId, newOriginalUrl);

      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { id: urlId },
      });
      expect(mockPrismaService.shortUrl.update).toHaveBeenCalledWith({
        where: { id: urlId },
        data: { originalUrl: newOriginalUrl },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          clickCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result.originalUrl).toBe(newOriginalUrl);
      expect(result.shortUrl).toBe('http://localhost:3002/abc123');
    });

    it('should throw NotFoundException when URL does not exist', async () => {
      const urlId = 'non-existing';
      const userId = 'user-123';
      const newOriginalUrl = 'https://github.com/updated';

      mockIsValidUrl.mockReturnValue(true);
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserUrl(userId, urlId, newOriginalUrl),
      ).rejects.toThrow('URL not found');
    });

    it('should throw ForbiddenException when URL belongs to different user', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';
      const otherUserId = 'user-456';
      const newOriginalUrl = 'https://github.com/updated';

      const existingUrl = {
        id: urlId,
        userId: otherUserId,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/old',
        clickCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockIsValidUrl.mockReturnValue(true);
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(existingUrl);

      await expect(
        service.updateUserUrl(userId, urlId, newOriginalUrl),
      ).rejects.toThrow('You can only update your own URLs');
    });

    it('should throw ForbiddenException when trying to update anonymous URL', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';
      const newOriginalUrl = 'https://github.com/updated';

      const anonymousUrl = {
        id: urlId,
        userId: null,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/anonymous',
        clickCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockIsValidUrl.mockReturnValue(true);
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(anonymousUrl);

      await expect(
        service.updateUserUrl(userId, urlId, newOriginalUrl),
      ).rejects.toThrow('You can only update your own URLs');
    });
  });

  describe('deleteUserUrl', () => {
    it('should soft delete URL when it belongs to the user', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';

      const existingUrl = {
        id: urlId,
        userId,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/test',
        clickCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(existingUrl);
      mockPrismaService.shortUrl.update.mockResolvedValue({
        ...existingUrl,
        deletedAt: new Date(),
      });

      await service.deleteUserUrl(userId, urlId);

      expect(mockPrismaService.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { id: urlId },
      });
      // Verify the call was made correctly
      expect(mockPrismaService.shortUrl.update).toHaveBeenCalledTimes(1);

      // Check the arguments passed to update
      const [updateArgs] = mockPrismaService.shortUrl.update.mock.calls[0] as [
        { where: { id: string }; data: { deletedAt: Date } },
      ];

      expect(updateArgs.where).toEqual({ id: urlId });
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.deletedAt.getTime()).toBeCloseTo(Date.now(), -1);
    });

    it('should throw NotFoundException when URL does not exist', async () => {
      const urlId = 'non-existing';
      const userId = 'user-123';

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.deleteUserUrl(userId, urlId)).rejects.toThrow(
        'URL not found',
      );
    });

    it('should throw ForbiddenException when URL belongs to different user', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';
      const otherUserId = 'user-456';

      const existingUrl = {
        id: urlId,
        userId: otherUserId,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/test',
        clickCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(existingUrl);

      await expect(service.deleteUserUrl(userId, urlId)).rejects.toThrow(
        'You can only delete your own URLs',
      );
    });

    it('should throw ForbiddenException when trying to delete anonymous URL', async () => {
      const urlId = 'url-123';
      const userId = 'user-123';

      const anonymousUrl = {
        id: urlId,
        userId: null,
        shortCode: 'abc123',
        originalUrl: 'https://github.com/anonymous',
        clickCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(anonymousUrl);

      await expect(service.deleteUserUrl(userId, urlId)).rejects.toThrow(
        'You can only delete your own URLs',
      );
    });
  });
});

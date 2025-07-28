import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { UrlShortenerServiceController } from './url-shortener-service.controller';
import { UrlShortenerServiceService } from '../services/url-shortener-service.service';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ShortUrlResponseDto } from '../dto/short-url-response.dto';
import { UrlInfoResponseDto } from '../dto/url-info-response.dto';

describe('UrlShortenerServiceController', () => {
  let controller: UrlShortenerServiceController;

  const mockUrlShortenerService = {
    shortenUrl: jest.fn(),
    getUrlInfo: jest.fn(),
    redirect: jest.fn(),
  };

  const mockShortUrlResponse: ShortUrlResponseDto = {
    shortCode: 'abc123',
    shortUrl: 'http://localhost:3002/abc123',
    originalUrl: 'https://example.com',
  };

  const mockUrlInfoResponse: UrlInfoResponseDto = {
    shortCode: 'abc123',
    originalUrl: 'https://example.com',
    clickCount: 5,
    shortUrl: 'http://localhost:3002/abc123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFastifyReply: Partial<FastifyReply> = {
    code: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerServiceController],
      providers: [
        {
          provide: UrlShortenerServiceService,
          useValue: mockUrlShortenerService,
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerServiceController>(
      UrlShortenerServiceController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('OK');
      expect(result.service).toBe('url-shortener-service');
      expect(result.version).toBe('0.1.0');
      expect(typeof result.timestamp).toBe('string');
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      );
    });

    it('should return current timestamp', () => {
      const before = new Date().getTime();
      const result = controller.getHealth();
      const after = new Date().getTime();
      const resultTime = new Date(result.timestamp).getTime();

      expect(resultTime).toBeGreaterThanOrEqual(before);
      expect(resultTime).toBeLessThanOrEqual(after);
    });
  });

  describe('shortenUrl', () => {
    const createShortUrlDto: CreateShortUrlDto = {
      originalUrl: 'https://example.com/very/long/url',
    };

    it('should create short URL successfully', async () => {
      mockUrlShortenerService.shortenUrl.mockResolvedValue(
        mockShortUrlResponse,
      );

      const result = await controller.shortenUrl(createShortUrlDto);

      expect(result).toEqual(mockShortUrlResponse);
      expect(mockUrlShortenerService.shortenUrl).toHaveBeenCalledWith(
        createShortUrlDto.originalUrl,
      );
      expect(mockUrlShortenerService.shortenUrl).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const invalidDto: CreateShortUrlDto = {
        originalUrl: 'not-a-valid-url',
      };

      mockUrlShortenerService.shortenUrl.mockRejectedValue(
        new BadRequestException('Invalid URL'),
      );

      await expect(controller.shortenUrl(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUrlShortenerService.shortenUrl).toHaveBeenCalledWith(
        invalidDto.originalUrl,
      );
    });

    it('should pass through service exceptions', async () => {
      const error = new Error('Database connection failed');
      mockUrlShortenerService.shortenUrl.mockRejectedValue(error);

      await expect(controller.shortenUrl(createShortUrlDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getUrlInfo', () => {
    const shortCode = 'abc123';

    it('should return URL info successfully', async () => {
      mockUrlShortenerService.getUrlInfo.mockResolvedValue(mockUrlInfoResponse);

      const result = await controller.getUrlInfo(shortCode);

      expect(result).toEqual(mockUrlInfoResponse);
      expect(mockUrlShortenerService.getUrlInfo).toHaveBeenCalledWith(
        shortCode,
      );
      expect(mockUrlShortenerService.getUrlInfo).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockUrlShortenerService.getUrlInfo.mockRejectedValue(
        new NotFoundException('URL not found'),
      );

      await expect(controller.getUrlInfo(shortCode)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUrlShortenerService.getUrlInfo).toHaveBeenCalledWith(
        shortCode,
      );
    });

    it('should handle different short codes', async () => {
      const differentShortCode = 'xyz789';
      const differentResponse = {
        ...mockUrlInfoResponse,
        shortCode: differentShortCode,
      };

      mockUrlShortenerService.getUrlInfo.mockResolvedValue(differentResponse);

      const result = await controller.getUrlInfo(differentShortCode);

      expect(result.shortCode).toBe(differentShortCode);
      expect(mockUrlShortenerService.getUrlInfo).toHaveBeenCalledWith(
        differentShortCode,
      );
    });
  });

  describe('redirect', () => {
    const shortCode = 'abc123';
    const originalUrl = 'https://example.com';

    beforeEach(() => {
      // Reset mock implementation
      (mockFastifyReply.code as jest.Mock).mockReturnThis();
      (mockFastifyReply.header as jest.Mock).mockReturnThis();
      (mockFastifyReply.send as jest.Mock).mockReturnThis();
    });

    it('should redirect successfully with 302 status', async () => {
      mockUrlShortenerService.redirect.mockResolvedValue(originalUrl);

      const result = await controller.redirect(
        shortCode,
        mockFastifyReply as FastifyReply,
      );

      expect(mockUrlShortenerService.redirect).toHaveBeenCalledWith(shortCode);
      expect(mockFastifyReply.code).toHaveBeenCalledWith(302);
      expect(mockFastifyReply.header).toHaveBeenCalledWith(
        'Location',
        originalUrl,
      );
      expect(mockFastifyReply.send).toHaveBeenCalled();
      expect(result).toBe(mockFastifyReply);
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockUrlShortenerService.redirect.mockRejectedValue(
        new NotFoundException('URL not found'),
      );

      await expect(
        controller.redirect(shortCode, mockFastifyReply as FastifyReply),
      ).rejects.toThrow(NotFoundException);
      expect(mockUrlShortenerService.redirect).toHaveBeenCalledWith(shortCode);
      expect(mockFastifyReply.code).not.toHaveBeenCalled();
      expect(mockFastifyReply.header).not.toHaveBeenCalled();
      expect(mockFastifyReply.send).not.toHaveBeenCalled();
    });

    it('should handle different URLs correctly', async () => {
      const differentUrl = 'https://different-site.com/path';
      mockUrlShortenerService.redirect.mockResolvedValue(differentUrl);

      await controller.redirect(shortCode, mockFastifyReply as FastifyReply);

      expect(mockFastifyReply.header).toHaveBeenCalledWith(
        'Location',
        differentUrl,
      );
    });

    it('should call fastify reply methods in correct order', async () => {
      mockUrlShortenerService.redirect.mockResolvedValue(originalUrl);

      const callOrder: string[] = [];
      (mockFastifyReply.code as jest.Mock).mockImplementation((code) => {
        callOrder.push(`code(${code})`);
        return mockFastifyReply;
      });
      (mockFastifyReply.header as jest.Mock).mockImplementation(
        (name, value) => {
          callOrder.push(`header(${name}, ${value})`);
          return mockFastifyReply;
        },
      );
      (mockFastifyReply.send as jest.Mock).mockImplementation(() => {
        callOrder.push('send()');
        return mockFastifyReply;
      });

      await controller.redirect(shortCode, mockFastifyReply as FastifyReply);

      expect(callOrder).toEqual([
        'code(302)',
        `header(Location, ${originalUrl})`,
        'send()',
      ]);
    });

    it('should pass through service exceptions', async () => {
      const error = new Error('Database connection failed');
      mockUrlShortenerService.redirect.mockRejectedValue(error);

      await expect(
        controller.redirect(shortCode, mockFastifyReply as FastifyReply),
      ).rejects.toThrow(error);
      expect(mockFastifyReply.code).not.toHaveBeenCalled();
    });
  });
});

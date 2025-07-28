import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  isValidUrl,
  generateRandomCode,
} from '../../../common/utils/url-utils';

@Injectable()
export class UrlShortenerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async shortenUrl(originalUrl: string, userId?: string) {
    if (!isValidUrl(originalUrl)) {
      throw new BadRequestException('Invalid URL');
    }

    const shortCode = await this.generateUniqueCode();

    const shortUrl = await this.prisma.shortUrl.create({
      data: {
        shortCode,
        originalUrl,
        userId: userId || null, // Associate with user if authenticated, null if anonymous
      },
    });

    return {
      shortCode: shortUrl.shortCode,
      shortUrl: `${process.env.REDIRECT_BASE_URL || 'http://localhost:3002'}/${shortUrl.shortCode}`,
      originalUrl: shortUrl.originalUrl,
    };
  }

  async redirect(shortCode: string) {
    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    if (!shortUrl) {
      throw new NotFoundException('URL not found');
    }

    // Record click asynchronously (don't block redirect)
    this.recordClick(shortCode).catch((error) => {
      console.error('Error recording click:', error);
    });

    return shortUrl.originalUrl;
  }

  async getUrlInfo(shortCode: string) {
    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    if (!shortUrl) {
      throw new NotFoundException('URL not found');
    }

    return {
      shortCode: shortUrl.shortCode,
      originalUrl: shortUrl.originalUrl,
      clickCount: shortUrl.clickCount,
      createdAt: shortUrl.createdAt,
      updatedAt: shortUrl.updatedAt,
      shortUrl: `${process.env.REDIRECT_BASE_URL || 'http://localhost:3002'}/${shortUrl.shortCode}`,
    };
  }

  async getUserUrls(userId: string) {
    const userUrls = await this.prisma.shortUrl.findMany({
      where: {
        userId,
        deletedAt: null, // Only non-deleted URLs
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
        createdAt: 'desc', // Most recent first
      },
    });

    return userUrls.map((url) => ({
      id: url.id,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      shortUrl: `${process.env.REDIRECT_BASE_URL || 'http://localhost:3002'}/${url.shortCode}`,
      clickCount: url.clickCount,
      createdAt: url.createdAt,
      updatedAt: url.updatedAt,
    }));
  }

  async updateUserUrl(userId: string, urlId: string, newOriginalUrl: string) {
    if (!isValidUrl(newOriginalUrl)) {
      throw new BadRequestException('Invalid URL');
    }

    // Check if URL belongs to user and exists
    const existingUrl = await this.prisma.shortUrl.findUnique({
      where: { id: urlId },
    });

    if (!existingUrl || existingUrl.deletedAt) {
      throw new NotFoundException('URL not found');
    }

    if (existingUrl.userId !== userId) {
      throw new ForbiddenException('You can only update your own URLs');
    }

    const updatedUrl = await this.prisma.shortUrl.update({
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

    return {
      id: updatedUrl.id,
      shortCode: updatedUrl.shortCode,
      originalUrl: updatedUrl.originalUrl,
      shortUrl: `${process.env.REDIRECT_BASE_URL || 'http://localhost:3002'}/${updatedUrl.shortCode}`,
      clickCount: updatedUrl.clickCount,
      createdAt: updatedUrl.createdAt,
      updatedAt: updatedUrl.updatedAt,
    };
  }

  async deleteUserUrl(userId: string, urlId: string) {
    // Check if URL belongs to user and exists
    const existingUrl = await this.prisma.shortUrl.findUnique({
      where: { id: urlId },
    });

    if (!existingUrl || existingUrl.deletedAt) {
      throw new NotFoundException('URL not found');
    }

    if (existingUrl.userId !== userId) {
      throw new ForbiddenException('You can only delete your own URLs');
    }

    // Soft delete
    await this.prisma.shortUrl.update({
      where: { id: urlId },
      data: { deletedAt: new Date() },
    });

    return { message: 'URL deleted successfully' };
  }

  private async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const code = generateRandomCode();

      const existingUrl = await this.prisma.shortUrl.findUnique({
        where: { shortCode: code },
      });

      if (!existingUrl) {
        return code;
      }

      attempts++;
    }

    throw new Error('Could not generate unique code');
  }

  private async recordClick(shortCode: string): Promise<void> {
    try {
      // Usar transação para garantir consistência
      await this.prisma.$transaction(async (tx) => {
        // Buscar e atualizar em uma operação atômica
        const shortUrl = await tx.shortUrl.findUniqueOrThrow({
          where: { shortCode },
          select: { id: true },
        });

        // Atualizar contador
        await tx.shortUrl.update({
          where: { id: shortUrl.id }, // Usar ID em vez de shortCode
          data: {
            clickCount: {
              increment: 1,
            },
          },
        });

        // Criar registro de clique
        await tx.urlClick.create({
          data: {
            shortUrlId: shortUrl.id,
          },
        });
      });
    } catch (error) {
      // Se a URL não existir mais, ignorar silenciosamente
      // (pode ter sido deletada entre redirect e recordClick)

      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }
}

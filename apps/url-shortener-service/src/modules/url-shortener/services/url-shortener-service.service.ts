import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  isValidUrl,
  generateRandomCode,
} from '../../../common/utils/url-utils';

@Injectable()
export class UrlShortenerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async shortenUrl(originalUrl: string) {
    if (!isValidUrl(originalUrl)) {
      throw new BadRequestException('Invalid URL');
    }

    const shortCode = await this.generateUniqueCode();

    const shortUrl = await this.prisma.shortUrl.create({
      data: {
        shortCode,
        originalUrl,
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

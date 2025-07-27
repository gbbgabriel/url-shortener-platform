import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { UrlShortenerServiceService } from '../services/url-shortener-service.service';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ShortUrlResponseDto } from '../dto/short-url-response.dto';
import { UrlInfoResponseDto } from '../dto/url-info-response.dto';
import { HealthResponseDto } from '../dto/health-response.dto';

// DTOs importados de arquivos separados

@Controller()
@ApiTags('url-shortener')
export class UrlShortenerServiceController {
  constructor(
    private readonly urlShortenerServiceService: UrlShortenerServiceService,
  ) {}

  @Get('health')
  @ApiTags('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica se o serviço está funcionando corretamente',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço funcionando normalmente',
    type: HealthResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'url-shortener-service',
      version: '0.1.0',
    };
  }

  @Post('shorten')
  @ApiTags('urls')
  @ApiOperation({
    summary: 'Encurtar URL',
    description:
      'Cria uma URL encurtada de 6 caracteres a partir de uma URL original',
  })
  @ApiBody({
    type: CreateShortUrlDto,
    description: 'Dados para encurtamento da URL',
    examples: {
      example1: {
        summary: 'Exemplo básico',
        value: {
          originalUrl: 'https://github.com/gbbgabriel/url-shortener-platform',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'URL encurtada com sucesso',
    type: ShortUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'URL inválida fornecida',
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async shortenUrl(@Body() body: CreateShortUrlDto) {
    return await this.urlShortenerServiceService.shortenUrl(body.originalUrl);
  }

  @Get('info/:shortCode')
  @ApiTags('urls')
  @ApiOperation({
    summary: 'Informações da URL',
    description:
      'Obtém informações detalhadas sobre uma URL encurtada, incluindo contagem de cliques',
  })
  @ApiParam({
    name: 'shortCode',
    description: 'Código de 6 caracteres da URL encurtada',
    example: 'RBuXFz',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações da URL encontradas',
    type: UrlInfoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'URL não encontrada',
  })
  @HttpCode(HttpStatus.OK)
  async getUrlInfo(@Param('shortCode') shortCode: string) {
    return await this.urlShortenerServiceService.getUrlInfo(shortCode);
  }

  @Get(':shortCode')
  @ApiTags('urls')
  @ApiOperation({
    summary: 'Redirecionar para URL original',
    description:
      'Redireciona para a URL original e incrementa o contador de cliques',
  })
  @ApiParam({
    name: 'shortCode',
    description: 'Código de 6 caracteres da URL encurtada',
    example: 'RBuXFz',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento realizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'URL não encontrada',
  })
  async redirect(
    @Param('shortCode') shortCode: string,
    @Res() reply: FastifyReply,
  ) {
    const originalUrl =
      await this.urlShortenerServiceService.redirect(shortCode);
    return reply.code(302).header('Location', originalUrl).send();
  }
}

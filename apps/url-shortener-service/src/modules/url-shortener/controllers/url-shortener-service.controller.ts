import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { UrlShortenerServiceService } from '../services/url-shortener-service.service';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { UpdateUrlDto } from '../dto/update-url.dto';
import { ShortUrlResponseDto } from '../dto/short-url-response.dto';
import { UserUrlResponseDto } from '../dto/user-url-response.dto';
import { UrlInfoResponseDto } from '../dto/url-info-response.dto';
import { HealthResponseDto } from '../dto/health-response.dto';
import {
  OptionalCurrentUser,
  OptionalUser,
} from '../../../common/decorators/optional-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

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
      version: '0.3.0',
    };
  }

  @Post('shorten')
  @ApiTags('urls')
  @ApiOperation({
    summary: 'Encurtar URL',
    description:
      'Cria uma URL encurtada de 6 caracteres a partir de uma URL original. ' +
      'Funciona com ou sem autenticação. Se autenticado, a URL será associada ao usuário.',
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
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async shortenUrl(
    @Body() body: CreateShortUrlDto,
    @OptionalCurrentUser() user: OptionalUser | null,
  ) {
    const userId = user?.userId;
    return await this.urlShortenerServiceService.shortenUrl(
      body.originalUrl,
      userId,
    );
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

  @Get('my-urls')
  @ApiTags('user-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar URLs do usuário',
    description:
      'Lista todas as URLs encurtadas criadas pelo usuário autenticado com contabilização de cliques',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de URLs do usuário',
    type: [UserUrlResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente',
  })
  @HttpCode(HttpStatus.OK)
  async getUserUrls(@CurrentUser() user: CurrentUser) {
    return await this.urlShortenerServiceService.getUserUrls(user.userId);
  }

  @Put('my-urls/:id')
  @ApiTags('user-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar URL do usuário',
    description: 'Atualiza a URL de destino de uma URL encurtada do usuário',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da URL a ser atualizada',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    type: UpdateUrlDto,
    description: 'Nova URL de destino',
  })
  @ApiResponse({
    status: 200,
    description: 'URL atualizada com sucesso',
    type: UserUrlResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiNotFoundResponse({
    description: 'URL não encontrada ou não pertence ao usuário',
  })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUserUrl(
    @Param('id') urlId: string,
    @Body() updateUrlDto: UpdateUrlDto,
    @CurrentUser() user: CurrentUser,
  ) {
    return await this.urlShortenerServiceService.updateUserUrl(
      user.userId,
      urlId,
      updateUrlDto.originalUrl,
    );
  }

  @Delete('my-urls/:id')
  @ApiTags('user-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deletar URL do usuário',
    description: 'Remove uma URL encurtada do usuário (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da URL a ser deletada',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'URL deletada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'URL deleted successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente',
  })
  @ApiNotFoundResponse({
    description: 'URL não encontrada ou não pertence ao usuário',
  })
  @HttpCode(HttpStatus.OK)
  async deleteUserUrl(
    @Param('id') urlId: string,
    @CurrentUser() user: CurrentUser,
  ) {
    return await this.urlShortenerServiceService.deleteUserUrl(
      user.userId,
      urlId,
    );
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class UserUrlResponseDto {
  @ApiProperty({
    description: 'ID único da URL',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id!: string;

  @ApiProperty({
    description: 'Código curto de 6 caracteres',
    example: 'RBuXFz',
  })
  shortCode!: string;

  @ApiProperty({
    description: 'URL original fornecida pelo usuário',
    example: 'https://github.com/gbbgabriel/url-shortener-platform',
  })
  originalUrl!: string;

  @ApiProperty({
    description: 'URL encurtada completa',
    example: 'http://localhost:3002/RBuXFz',
  })
  shortUrl!: string;

  @ApiProperty({
    description: 'Número total de cliques',
    example: 42,
  })
  clickCount!: number;

  @ApiProperty({
    description: 'Data de criação da URL',
    example: '2025-01-27T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-01-27T15:30:00.000Z',
  })
  updatedAt!: Date;
}

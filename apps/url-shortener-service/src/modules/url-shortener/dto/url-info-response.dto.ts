import { ApiProperty } from '@nestjs/swagger';

export class UrlInfoResponseDto {
  @ApiProperty({
    description: 'Código de 6 caracteres da URL encurtada',
    example: 'RBuXFz',
  })
  shortCode!: string;

  @ApiProperty({
    description: 'URL original',
    example: 'https://www.google.com',
  })
  originalUrl!: string;

  @ApiProperty({
    description: 'Número total de cliques',
    example: 42,
  })
  clickCount!: number;

  @ApiProperty({
    description: 'URL encurtada completa',
    example: 'http://localhost:8080/RBuXFz',
  })
  shortUrl!: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}

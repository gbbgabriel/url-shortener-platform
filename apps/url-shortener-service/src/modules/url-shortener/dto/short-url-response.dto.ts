import { ApiProperty } from '@nestjs/swagger';

export class ShortUrlResponseDto {
  @ApiProperty({
    description: 'Código de 6 caracteres da URL encurtada',
    example: 'RBuXFz',
  })
  shortCode!: string;

  @ApiProperty({
    description: 'URL encurtada completa',
    example: 'http://localhost:8080/RBuXFz',
  })
  shortUrl!: string;

  @ApiProperty({
    description: 'URL original fornecida',
    example: 'https://www.google.com',
  })
  originalUrl!: string;
}

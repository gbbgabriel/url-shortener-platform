import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Status do serviço',
    example: 'OK',
  })
  status!: string;

  @ApiProperty({
    description: 'Nome do serviço',
    example: 'url-shortener-service',
  })
  service!: string;

  @ApiProperty({
    description: 'Versão atual',
    example: '0.3.0',
  })
  version!: string;

  @ApiProperty({
    description: 'Timestamp da verificação',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp!: string;
}

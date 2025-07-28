import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateUrlDto {
  @ApiProperty({
    description: 'Nova URL de destino',
    example: 'https://github.com/gbbgabriel/url-shortener-platform-v2',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsNotEmpty({ message: 'Original URL is required' })
  originalUrl!: string;
}

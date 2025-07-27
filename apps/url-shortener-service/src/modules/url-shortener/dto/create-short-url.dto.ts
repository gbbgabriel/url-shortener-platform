import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateShortUrlDto {
  @ApiProperty({
    description: 'URL original a ser encurtada',
    example: 'https://www.google.com',
    type: String,
  })
  @IsNotEmpty({ message: 'URL é obrigatória' })
  @IsString({ message: 'URL deve ser uma string' })
  @IsUrl({}, { message: 'Formato de URL inválido' })
  originalUrl!: string;
}

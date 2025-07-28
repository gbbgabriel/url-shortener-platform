import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type',
  })
  tokenType!: string;

  @ApiProperty({
    example: '24h',
    description: 'Token expiration time',
  })
  expiresIn!: string;

  @ApiProperty({
    example: {
      id: 'uuid-string',
      email: 'user@example.com',
      isActive: true,
      createdAt: '2025-01-28T00:00:00.000Z',
    },
    description: 'User information',
  })
  user!: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
  };
}

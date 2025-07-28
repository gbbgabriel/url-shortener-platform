import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: 'uuid-string',
    description: 'User unique identifier',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: true,
    description: 'Whether the user account is active',
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'User creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2025-01-28T00:00:00.000Z',
    description: 'User last update timestamp',
  })
  updatedAt!: Date;
}

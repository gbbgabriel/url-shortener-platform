import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Custom decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: UserResponseDto
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserResponseDto => {
    const request = ctx.switchToHttp().getRequest<{ user: UserResponseDto }>();
    return request.user;
  },
);

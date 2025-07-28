import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface CurrentUser {
  userId: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface RequestWithHeaders {
  headers: {
    authorization?: string;
  };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithHeaders>();
    const authHeader = request.headers?.authorization;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const jwtService = new JwtService({ secret: process.env.JWT_SECRET });
      const payload = jwtService.verify<JwtPayload>(token);

      return {
        userId: payload.sub,
        email: payload.email,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  },
);

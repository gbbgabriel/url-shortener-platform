import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface OptionalUser {
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

export const OptionalCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OptionalUser | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithHeaders>();
    const authHeader = request.headers?.authorization;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      return null; // No token provided - return null for anonymous user
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
      // Invalid or expired token - treat as anonymous user
      return null;
    }
  },
);

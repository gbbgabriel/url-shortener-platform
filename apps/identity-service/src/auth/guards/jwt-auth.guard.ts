import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

interface JwtError {
  name: string;
  message: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determine if the current request is authorized
   * @param context - Execution context containing request information
   * @returns Boolean or Promise/Observable of boolean indicating authorization status
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   * @param err - Error from authentication process
   * @param user - User object (if authentication succeeded)
   * @param info - Additional information about authentication failure
   * @returns User object if authentication succeeded
   * @throws UnauthorizedException if authentication failed
   */
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info?: JwtError,
  ): TUser {
    // Handle specific JWT errors
    if (err || !user) {
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format');
      }
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }

      throw new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}

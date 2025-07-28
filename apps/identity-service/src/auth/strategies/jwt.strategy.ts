import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const secretOrKey = configService.get<string>('JWT_SECRET');

    if (!secretOrKey) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  /**
   * Validate JWT payload and return user data
   * This method is called automatically by Passport when a valid JWT is provided
   * @param payload - JWT payload containing user information
   * @returns User data to be attached to the request
   */
  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    try {
      // Validate that the user still exists and is active
      const user = await this.authService.validateJwtPayload(payload);
      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

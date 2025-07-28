import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * User login with email and password
   * @param loginDto - Login credentials
   * @returns JWT token and user data
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Validate user credentials
    const user = await this.usersService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = '24h';

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user,
    };
  }

  /**
   * User registration
   * @param registerDto - Registration data
   * @returns JWT token and user data
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Create user account
      const user = await this.usersService.createUser(registerDto);

      // Generate JWT token for the new user
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      const expiresIn = '24h';

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        user,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Failed to create user account');
    }
  }

  /**
   * Validate JWT payload and return user data
   * @param payload - JWT payload
   * @returns User data
   */
  async validateJwtPayload(payload: JwtPayload): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.findById(payload.sub);
      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Generate access token for user
   * @param user - User data
   * @returns JWT access token
   */
  async generateAccessToken(user: UserResponseDto): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload);
  }
}

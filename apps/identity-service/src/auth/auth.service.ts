import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@app/observability';
import { MetricsService } from '@app/observability';
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * User login with email and password
   * @param loginDto - Login credentials
   * @returns JWT token and user data
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const startTime = Date.now();

    try {
      // Validate user credentials
      const user = await this.usersService.validateUser(
        loginDto.email,
        loginDto.password,
      );

      if (!user) {
        // ✅ LOGGING: Failed login
        this.loggerService.warn('Failed login attempt', {
          email: loginDto.email,
          operation: 'login_failed',
          duration: Date.now() - startTime,
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      // Register successful login metrics
      this.metricsService.incrementHttpRequests(
        'POST',
        '/auth/login',
        200,
        'identity',
      );
      this.metricsService.observeHttpDuration(
        'POST',
        '/auth/login',
        'identity',
        Date.now() - startTime,
      );

      // Successful login log
      this.loggerService.log('User login successful', {
        userId: user.id,
        email: user.email,
        operation: 'login_success',
        duration: Date.now() - startTime,
      });

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: '24h',
        user: {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      this.loggerService.error('Login failed', {
        operation: 'login',
        email: loginDto.email,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
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

      this.logger.log(`User registered successfully: ${user.id}`, {
        userId: user.id,
        email: user.email,
        operation: 'user_registered',
      });

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

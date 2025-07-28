import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    validateUser: jest.fn(),
    createUser: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: '123',
        email: loginDto.email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'mock.jwt.token';

      mockUsersService.validateUser.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe(mockToken);
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe('24h');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };

      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should create user and return access token', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123' };
      const mockUser = {
        id: '456',
        email: registerDto.email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'mock.jwt.token';

      mockUsersService.createUser.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe(mockToken);
      expect(result.user).toEqual(mockUser);
    });

    it('should throw ConflictException when user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockUsersService.createUser.mockRejectedValue(
        new ConflictException('User already exists'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user for valid JWT payload', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateJwtPayload(payload);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      const payload = { sub: 'invalid', email: 'test@example.com' };

      mockUsersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

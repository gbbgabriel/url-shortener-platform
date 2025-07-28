import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { UsersService } from './users.service';
import { HashService } from '../common/services/hash.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockHashService = {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: '123',
        email: userData.email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockHashService.hashPassword.mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockHashService.hashPassword).toHaveBeenCalledWith(
        userData.password,
      );
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when user exists', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      const existingUser = { id: '123', email: userData.email };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.createUser(userData)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userWithPassword = {
        id: '123',
        email,
        passwordHash: 'hashedPassword',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithPassword);
      mockHashService.comparePassword.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!.email).toBe(email);
      expect(mockHashService.comparePassword).toHaveBeenCalledWith(
        password,
        userWithPassword.passwordHash,
      );
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const userWithPassword = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithPassword);
      mockHashService.comparePassword.mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userId = '123';
      const user = {
        id: userId,
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findById(userId);

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

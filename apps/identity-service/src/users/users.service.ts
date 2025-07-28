import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { HashService } from '../common/services/hash.service';
import { RegisterDto } from '../auth/dto/register.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  /**
   * Create a new user account
   * @param registerDto - User registration data
   * @returns Created user data (without password)
   */
  async createUser(registerDto: RegisterDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashService.hashPassword(
      registerDto.password,
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User data including password hash for authentication
   */
  async findByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    return await this.prisma.user.findUnique({
      where: {
        email,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User data (without password)
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Validate user credentials
   * @param email - User email
   * @param password - Plain text password
   * @returns User data if credentials are valid, null otherwise
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.hashService.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    void passwordHash; // Mark as intentionally unused
    return userWithoutPassword;
  }
}

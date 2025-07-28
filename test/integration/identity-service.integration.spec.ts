import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { testDb } from '../setup/integration.setup';
import { AuthService } from '../../apps/identity-service/src/auth/auth.service';
import { UsersService } from '../../apps/identity-service/src/users/users.service';
import { HashService } from '../../apps/identity-service/src/common/services/hash.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService, MetricsService } from '@app/observability';

describe('Identity Service - REAL Integration Tests', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let hashService: HashService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        HashService,
        {
          provide: PrismaService,
          useValue: testDb,
        },
        {
          provide: JwtService,
          useFactory: () =>
            new JwtService({
              secret: 'test-secret-integration',
              signOptions: { expiresIn: '24h' },
            }),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret-integration';
              if (key === 'JWT_EXPIRES_IN') return '24h';
              return null;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementHttpRequests: jest.fn(),
            observeHttpDuration: jest.fn(),
            incrementUrlCreated: jest.fn(),
            incrementUrlClick: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    hashService = module.get<HashService>(HashService);
  });

  afterAll(async () => {
    // Cleanup completo
    await testDb.user.deleteMany({
      where: {
        email: {
          contains: 'integration-test',
        },
      },
    });
  });

  describe('AuthService Integration', () => {
    it('should register user with real database persistence', async () => {
      const userData = {
        email: `register-integration-${Date.now()}@integration-test.com`,
        password: 'IntegrationTest123!',
      };

      const result = await authService.register(userData);

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.isActive).toBe(true);

      // Verificar se realmente foi salvo no banco
      const userInDb = await testDb.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).toBeTruthy();
      expect(userInDb!.email).toBe(userData.email);
      expect(userInDb!.isActive).toBe(true);
    });

    it('should throw ConflictException for duplicate registration', async () => {
      const userData = {
        email: `duplicate-integration-${Date.now()}@integration-test.com`,
        password: 'DuplicateTest123!',
      };

      // Primeiro registro
      await authService.register(userData);

      // Segundo registro deve falhar
      await expect(authService.register(userData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should login with correct credentials and generate valid JWT', async () => {
      const userData = {
        email: `login-integration-${Date.now()}@integration-test.com`,
        password: 'LoginTest123!',
      };

      // Registrar usuário
      await authService.register(userData);

      // Fazer login
      const loginResult = await authService.login(userData);

      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.user.email).toBe(userData.email);
      expect(loginResult.tokenType).toBe('Bearer');
      expect(loginResult.expiresIn).toBe('24h');

      // Verificar que o JWT tem formato válido (header.payload.signature)
      const jwtParts = loginResult.accessToken.split('.');
      expect(jwtParts).toHaveLength(3);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const validUser = {
        email: `valid-integration-${Date.now()}@integration-test.com`,
        password: 'ValidPassword123!',
      };

      // Registrar usuário válido
      await authService.register(validUser);

      // Tentar login com senha incorreta
      await expect(
        authService.login({
          email: validUser.email,
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      // Tentar login com email inexistente
      await expect(
        authService.login({
          email: 'nonexistent@integration-test.com',
          password: 'AnyPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('UsersService Integration', () => {
    it('should create user with proper password hashing', async () => {
      const userData = {
        email: `hash-integration-${Date.now()}@integration-test.com`,
        password: 'HashTest123!',
      };

      const user = await usersService.createUser(userData);

      expect(user.email).toBe(userData.email);
      expect(user.isActive).toBe(true);

      // Verificar se a senha foi hasheada no banco
      const userInDb = await testDb.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });

      expect(userInDb!.passwordHash).toBeDefined();
      expect(userInDb!.passwordHash).not.toBe(userData.password);
      expect(userInDb!.passwordHash.length).toBeGreaterThan(50); // Hash bcrypt
    });

    it('should validate user credentials correctly', async () => {
      const userData = {
        email: `validate-integration-${Date.now()}@integration-test.com`,
        password: 'ValidateTest123!',
      };

      // Criar usuário
      await usersService.createUser(userData);

      // Validar credenciais corretas
      const validUser = await usersService.validateUser(
        userData.email,
        userData.password,
      );
      expect(validUser).toBeTruthy();
      expect(validUser!.email).toBe(userData.email);

      // Validar credenciais incorretas
      const invalidUser = await usersService.validateUser(
        userData.email,
        'WrongPassword123!',
      );
      expect(invalidUser).toBeNull();
    });

    it('should find user by ID correctly', async () => {
      const userData = {
        email: `findid-integration-${Date.now()}@integration-test.com`,
        password: 'FindIdTest123!',
      };

      const createdUser = await usersService.createUser(userData);

      // Encontrar usuário por ID
      const foundUser = await usersService.findById(createdUser.id);
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe(userData.email);

      // Tentar encontrar usuário inexistente
      await expect(usersService.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('HashService Integration', () => {
    it('should hash passwords consistently', async () => {
      const password = 'TestPassword123!';

      const hash1 = await hashService.hashPassword(password);
      const hash2 = await hashService.hashPassword(password);

      // Hashes devem ser diferentes (salt único)
      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBeGreaterThan(50);
      expect(hash2.length).toBeGreaterThan(50);

      // Mas ambos devem validar a mesma senha
      expect(await hashService.comparePassword(password, hash1)).toBe(true);
      expect(await hashService.comparePassword(password, hash2)).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';

      const hash = await hashService.hashPassword(correctPassword);

      expect(await hashService.comparePassword(correctPassword, hash)).toBe(
        true,
      );
      expect(await hashService.comparePassword(wrongPassword, hash)).toBe(
        false,
      );
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      const userData = {
        email: `lifecycle-integration-${Date.now()}@integration-test.com`,
        password: 'LifecycleTest123!',
      };

      // 1. Registrar usuário
      const registerResult = await authService.register(userData);
      expect(registerResult.user.email).toBe(userData.email);

      // 2. Verificar no banco
      const userInDb = await testDb.user.findUnique({
        where: { email: userData.email },
      });
      expect(userInDb).toBeTruthy();

      // 3. Fazer login
      const loginResult = await authService.login(userData);
      expect(loginResult.user.id).toBe(registerResult.user.id);

      // 4. Validar JWT payload
      const jwtPayload = { sub: loginResult.user.id, email: userData.email };
      const validatedUser = await authService.validateJwtPayload(jwtPayload);
      expect(validatedUser.id).toBe(loginResult.user.id);
    });

    it('should handle concurrent user operations safely', async () => {
      const baseEmail = `concurrent-integration-${Date.now()}`;
      const userCount = 5;

      // Criar múltiplos usuários simultaneamente
      const userPromises = Array.from({ length: userCount }, (_, i) =>
        authService.register({
          email: `${baseEmail}-${i}@integration-test.com`,
          password: 'ConcurrentTest123!',
        }),
      );

      const results = await Promise.all(userPromises);

      // Verificar que todos foram criados com sucesso
      expect(results).toHaveLength(userCount);
      results.forEach((result, i) => {
        expect(result.user.email).toBe(
          `${baseEmail}-${i}@integration-test.com`,
        );
        expect(result.accessToken).toBeDefined();
      });

      // Verificar que todos existem no banco
      const usersInDb = await testDb.user.findMany({
        where: {
          email: {
            startsWith: baseEmail,
          },
        },
      });

      expect(usersInDb).toHaveLength(userCount);
    });

    it('should maintain data integrity under stress', async () => {
      const userData = {
        email: `stress-integration-${Date.now()}@integration-test.com`,
        password: 'StressTest123!',
      };

      // Registrar usuário
      await authService.register(userData);

      // Fazer múltiplos logins simultâneos
      const loginPromises = Array.from({ length: 10 }, () =>
        authService.login(userData),
      );

      const loginResults = await Promise.all(loginPromises);

      // Todos devem ser bem-sucedidos
      loginResults.forEach((result) => {
        expect(result.user.email).toBe(userData.email);
        expect(result.accessToken).toBeDefined();
      });

      // Verificar que não houve corrupção no banco
      const userInDb = await testDb.user.findUnique({
        where: { email: userData.email },
      });

      expect(userInDb).toBeTruthy();
      expect(userInDb!.email).toBe(userData.email);
      expect(userInDb!.isActive).toBe(true);
    });
  });
});

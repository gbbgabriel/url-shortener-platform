import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../apps/identity-service/src/app.module';
import { testDb } from '../setup/e2e.setup';
import { PrismaService } from '@app/prisma';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

describe('Identity Service API - End-to-End FUNCTIONAL Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-jwt-key-for-e2e-tests',
              JWT_EXPIRES_IN: '24h',
            }),
          ],
        }),
        AppModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(testDb)
      .overrideModule(JwtModule)
      .useModule(
        JwtModule.register({
          secret: 'test-secret-jwt-key-for-e2e-tests',
          signOptions: { expiresIn: '24h' },
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Global validation pipe (MESMO do main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.register(import('@fastify/cors'), {
      origin: true,
    });

    await app.listen(0); // Porta aleatória para evitar conflitos
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check (GET /health)', () => {
    it('should return service health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.payload) as HealthResponse;
      expect(data).toMatchObject({
        status: 'OK',
        service: 'identity-service',
        version: '0.2.0',
      });
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('User Registration (POST /auth/register)', () => {
    it('should create user for valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: `functional-${Date.now()}@e2e-test.com`,
          password: 'FunctionalTest123!',
        },
      });

      expect(response.statusCode).toBe(201);

      const data = JSON.parse(response.payload) as AuthResponse;
      expect(data.accessToken).toBeDefined();
      expect(data.tokenType).toBe('Bearer');
      expect(data.expiresIn).toBe('24h');
      expect(data.user.email).toContain('e2e-test.com');
      expect(data.user.isActive).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: `weak-${Date.now()}@e2e-test.com`,
          password: '123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should prevent duplicate registration', async () => {
      const userData = {
        email: `duplicate-${Date.now()}@e2e-test.com`,
        password: 'DuplicateTest123!',
      };

      // Primeiro registro - deve funcionar
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });
      expect(firstResponse.statusCode).toBe(201);

      // Segundo registro - deve falhar
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });
      expect(secondResponse.statusCode).toBe(409);
    });
  });

  describe('User Login (POST /auth/login)', () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@e2e-test.com`;
      const password = 'LoginTest123!';

      // Primeiro registrar usuário
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email, password },
      });

      // Fazer login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password },
      });

      expect(loginResponse.statusCode).toBe(200);

      const loginData = JSON.parse(loginResponse.payload) as AuthResponse;
      expect(loginData.accessToken).toBeDefined();
      expect(loginData.user.email).toBe(email);
    });

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@e2e-test.com',
          password: 'AnyPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Protected Endpoints (GET /auth/me)', () => {
    it('should access protected endpoint with valid JWT', async () => {
      const email = `protected-${Date.now()}@e2e-test.com`;

      // Registrar e obter token
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password: 'ProtectedTest123!',
        },
      });

      const authData = JSON.parse(registerResponse.payload) as AuthResponse;

      // Acessar endpoint protegido
      const profileResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${authData.accessToken}`,
        },
      });

      expect(profileResponse.statusCode).toBe(200);

      const profile = JSON.parse(
        profileResponse.payload,
      ) as AuthResponse['user'];
      expect(profile.id).toBe(authData.user.id);
      expect(profile.email).toBe(authData.user.email);
    });

    it('should reject access without JWT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle a complete user journey', async () => {
      const userEmail = `journey-${Date.now()}@e2e-test.com`;
      const userPassword = 'JourneyTest123!';

      // 1. Usuário se registra
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      expect(registerResponse.statusCode).toBe(201);
      const registerData = JSON.parse(registerResponse.payload) as AuthResponse;

      // 2. Usuário faz múltiplas requisições ao perfil
      const profilePromises = Array.from({ length: 3 }, () =>
        app.inject({
          method: 'GET',
          url: '/auth/me',
          headers: {
            Authorization: `Bearer ${registerData.accessToken}`,
          },
        }),
      );

      const profileResponses = await Promise.all(profilePromises);
      profileResponses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });

      // 3. Usuário faz login novamente
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginData = JSON.parse(loginResponse.payload) as AuthResponse;
      expect(loginData.user.id).toBe(registerData.user.id);
    });

    it('should handle burst registration traffic', async () => {
      const userCount = 5;
      const startTime = Date.now();

      // Simular múltiplos usuários se registrando simultaneamente
      const registrationPromises = Array.from({ length: userCount }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/auth/register',
          payload: {
            email: `burst-user-${Date.now()}-${i}@e2e-test.com`,
            password: 'BurstTest123!',
          },
        }),
      );

      const responses = await Promise.all(registrationPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verificar que todos foram registrados com sucesso
      responses.forEach((response) => {
        expect(response.statusCode).toBe(201);
      });

      // Performance: não deve demorar mais que 3 segundos (realístico)
      expect(duration).toBeLessThan(3000);

      // Verificar que todos os usuários são únicos
      const userIds = responses.map((response) => {
        const data = JSON.parse(response.payload) as AuthResponse;
        return data.user.id;
      });

      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(userCount);
    });
  });
});

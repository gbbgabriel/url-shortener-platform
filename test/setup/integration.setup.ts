import { PrismaClient } from '@prisma/client';

// Use DATABASE_URL from environment (CI) or fallback to local config
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://admin:password@localhost:5432/urlshortener';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

beforeAll(async () => {
  // Conectar ao banco de desenvolvimento para testes de integração com retry para CI
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      console.log('🔗 Connected to development database for Integration');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to connect to database after retries:', error);
        throw error;
      }
      console.log(
        `🔄 Retrying database connection... (${retries} attempts left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}, 30000); // Aumentar timeout para 30s no CI

beforeEach(async () => {
  // Limpar dados de teste entre testes para isolamento
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'integration-test.com',
      },
    },
  });
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany({
    where: {
      originalUrl: {
        contains: 'integration-test',
      },
    },
  });
});

afterAll(async () => {
  // Limpeza final só dos dados de teste
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'integration-test.com',
      },
    },
  });
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany({
    where: {
      originalUrl: {
        contains: 'integration-test',
      },
    },
  });
  await prisma.$disconnect();
  console.log('🔌 Disconnected from integration test database');
});

// Exportar para uso nos testes de integração
export { prisma as testDb };

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://admin:password@localhost:5432/urlshortener',
    },
  },
});

beforeAll(async () => {
  // Conectar ao banco de desenvolvimento para testes de integração
  await prisma.$connect();
  console.log('🔗 Connected to development database for Integration');
});

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

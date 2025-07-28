import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://admin:password@localhost:5432/urlshortener',
    },
  },
});

beforeAll(async () => {
  // Conectar ao banco de desenvolvimento para testes
  await prisma.$connect();
  console.log('🔗 Connected to development database for E2E');

  // Aguardar um pouco para garantir que a aplicação está rodando
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

beforeEach(async () => {
  // Limpar dados de teste entre testes para isolamento
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'e2e-test.com',
      },
    },
  });
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany({
    where: {
      originalUrl: {
        contains: 'e2e-test',
      },
    },
  });
});

afterAll(async () => {
  // Limpeza final só dos dados de teste
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'e2e-test.com',
      },
    },
  });
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany({
    where: {
      originalUrl: {
        contains: 'e2e-test',
      },
    },
  });
  await prisma.$disconnect();
  console.log('🔌 Disconnected from test database');
});

// Exportar para uso nos testes E2E
export { prisma as testDb };

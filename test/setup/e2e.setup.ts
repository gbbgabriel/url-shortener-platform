import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://test_user:test_password@localhost:5433/test_db',
    },
  },
});

beforeAll(async () => {
  // Conectar ao banco de teste
  await prisma.$connect();
  console.log('🔗 Connected to test database for E2E');

  // Aguardar um pouco para garantir que a aplicação está rodando
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

beforeEach(async () => {
  // Limpar dados entre testes para isolamento completo
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany();
});

afterAll(async () => {
  // Limpeza final
  await prisma.urlClick.deleteMany();
  await prisma.shortUrl.deleteMany();
  await prisma.$disconnect();
  console.log('🔌 Disconnected from test database');
});

// Exportar para uso nos testes E2E
export { prisma as testDb };

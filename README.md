# 🔗 URL Shortener Platform

**Release 0.1.0** - Plataforma de encurtamento de URLs com arquitetura de microserviços.

## 🚀 Setup do Zero

### 📋 Pré-requisitos

- **Docker** e **Docker Compose** instalados
- **Node.js 20+** (se rodando fora do Docker)
- **Git** para clonar o repositório

### 🔧 Instalação Completa (Primeira Vez)

```bash
# 1. Clonar o repositório
git clone <repository-url>
cd url-shortener-platform

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env conforme necessário

# 3. Instalar dependências (opcional, já está no Docker)
npm install

# 4. Subir todos os serviços
docker-compose up -d --build

# 5. Aguardar containers ficarem saudáveis (30-60 segundos)
docker-compose ps

# 6. Verificar se está funcionando
curl http://localhost:8080/health
```

### 🔄 Restart Completo (Quando algo der errado)

```bash
# 1. Parar e remover TUDO (containers + volumes + imagens)
docker-compose down -v --remove-orphans
docker rmi $(docker images | grep url-shortener-platform | awk '{print $3}')

# 2. Rebuild completo do zero
docker-compose up -d --build

# 3. Aguardar estabilização
sleep 30 && docker-compose ps

# 4. Verificar health
curl http://localhost:8080/health
```

### ⚡ Comandos Rápidos Diários

```bash
# Subir serviços
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f

# Verificar status
docker-compose ps

# Parar serviços
docker-compose down
```

## 🧪 Testing Completo

### 🎯 Suite de Testes Completa

Execute todos os testes para garantir que tudo está funcionando:

```bash
# 1. Testes Unitários (8 testes)
npm test

# 2. Subir banco de teste para E2E/Integration
docker-compose -f docker-compose.test.yml up -d

# 3. Aguardar banco de teste ficar pronto
sleep 10

# 4. Sincronizar schema no banco de teste
DATABASE_URL="postgresql://test_user:test_password@localhost:5433/test_db" npx prisma db push

# 5. Testes End-to-End (16 testes)
npm run test:e2e

# 6. Testes de Integração (5 testes)
npm run test:integration

# 7. Limpar ambiente de teste
docker-compose -f docker-compose.test.yml down
```

### 📊 Resumo dos Testes

| Tipo            | Quantidade    | Descrição                                                 |
| --------------- | ------------- | --------------------------------------------------------- |
| **Unit**        | 8 testes      | Funções utilitárias (URL validation, code generation)     |
| **E2E**         | 16 testes     | APIs completas via HTTP (health, shorten, redirect, info) |
| **Integration** | 5 testes      | Banco de dados + serviços                                 |
| **Total**       | **29 testes** | **100% dos cenários críticos cobertos**                   |

### 🔍 Testes Manuais Críticos

Após subir a aplicação, execute estes testes manuais:

```bash
# 1. Health Check
curl http://localhost:8080/health

# 2. Criar URL encurtada
curl -X POST http://localhost:8080/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://github.com/gbbgabriel/url-shortener-platform"}'

# 3. Testar redirecionamento (substitua SHORTCODE pelo retornado acima)
curl -I http://localhost:3002/SHORTCODE

# 4. Verificar informações e click tracking
curl http://localhost:8080/info/SHORTCODE

# 5. Testar URL inexistente
curl http://localhost:3002/inexistente

# 6. Verificar documentação Swagger
open http://localhost:3002/api/docs
```

### 🚨 Troubleshooting

#### ❌ Containers não sobem

```bash
# Verificar se portas estão ocupadas
lsof -i :8080 -i :3002 -i :5432 -i :6379

# Limpar Docker completamente
docker system prune -a --volumes
```

#### ❌ Banco de dados não conecta

```bash
# Verificar se PostgreSQL está healthy
docker-compose ps postgres

# Ver logs do banco
docker-compose logs postgres

# Forçar recreação do banco
docker-compose down -v
docker-compose up -d postgres
```

#### ❌ Testes E2E falham

```bash
# Verificar se banco de teste está rodando
docker-compose -f docker-compose.test.yml ps

# Recriar banco de teste
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
DATABASE_URL="postgresql://test_user:test_password@localhost:5433/test_db" npx prisma db push
```

#### ❌ URLs não redirecionam

- **Usar porta 3002** para redirects, não 8080
- Verificar se a variável `REDIRECT_BASE_URL` está configurada
- Confirmar que o container do serviço está healthy

### ✅ Checklist de Validação

Antes de considerar a aplicação pronta:

- [ ] `docker-compose ps` mostra todos containers **healthy**
- [ ] `curl http://localhost:8080/health` retorna **200 OK**
- [ ] URLs são criadas via `POST /shorten` com sucesso
- [ ] Redirects funcionam via `GET http://localhost:3002/CODE`
- [ ] Click tracking incrementa em `GET /info/CODE`
- [ ] **29/29 testes** passando (8 unit + 16 e2e + 5 integration)
- [ ] Swagger disponível em `http://localhost:3002/api/docs`
- [ ] URLs inexistentes retornam **404**

## 🏗️ Arquitetura do Sistema

### 📊 Visão Geral

```mermaid
flowchart TD
    Client[👤 Cliente/Browser] --> Gateway{🎯 Operação?}

    Gateway -->|📝 Criar URLs| KrakenD[⚡ KrakenD Gateway :8080]
    Gateway -->|📊 Info URLs| KrakenD
    Gateway -->|💚 Health Check| KrakenD

    Gateway -->|🔄 Redirecionamento| Service[🎯 URL Service :3002]

    KrakenD --> Service
    Service --> DB[(🐘 PostgreSQL :5432)]
    Service --> Cache[(⚡ Redis :6379)]

    subgraph "🛡️ Recursos do Gateway"
        RL[Rate Limiting]
        CORS[CORS Headers]
        LOG[Logging]
    end

    KrakenD --> RL
    KrakenD --> CORS
    KrakenD --> LOG

    subgraph "📋 APIs Implementadas"
        API1[POST /shorten]
        API2[GET /info/:code]
        API3[GET /health]
        API4[GET /:code → 301 Redirect]
    end
```

### 🔄 Fluxo de Dados por Operação

#### 1. **📝 Criar URL Encurtada**

```
Cliente → KrakenD :8080 → Service :3002 → PostgreSQL
                    ↓
               Rate Limiting + CORS
```

#### 2. **📊 Obter Informações**

```
Cliente → KrakenD :8080 → Service :3002 → PostgreSQL
                    ↓
               Cache + Validação
```

#### 3. **🔄 Redirecionamento (DIRETO)**

```
Cliente → Service :3002 → PostgreSQL → HTTP 301 Redirect
             ↓
        Contabiliza Click
```

### ⚠️ Arquitetura Híbrida - Por que?

#### **🎯 Problema Técnico Identificado:**

- **KrakenD v2.5** não propaga redirects HTTP 301/302 corretamente
- O gateway intercepta os redirects e retorna HTML em vez de redirecionar

#### **✅ Solução Implementada:**

- **Gateway (8080)**: Todas as operações de API (criar, info, health)
- **Serviço Direto (3002)**: Apenas redirects para melhor performance

#### **🚀 Benefícios da Arquitetura:**

1. **Rate Limiting**: Protege contra spam na criação de URLs
2. **CORS**: Headers corretos para browsers
3. **Logging**: Centralizado no gateway
4. **Performance**: Redirects diretos sem overhead
5. **Escalabilidade**: Preparado para múltiplos serviços

### 🎯 Portas e Serviços

| Serviço             | Porta | Propósito      | Acesso            |
| ------------------- | ----- | -------------- | ----------------- |
| **KrakenD Gateway** | 8080  | API Management | Público           |
| **URL Shortener**   | 3002  | Core Logic     | Interno/Redirects |
| **PostgreSQL**      | 5432  | Persistência   | Interno           |
| **Redis**           | 6379  | Cache          | Interno           |

## 🚀 Tecnologias

- **Backend**: NestJS + TypeScript + Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **API Gateway**: KrakenD
- **Infrastructure**: Docker Compose
- **Documentation**: Swagger/OpenAPI

## ⚙️ Configuração de Ambiente

### 1. Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```bash
# Configurações principais
NODE_ENV=development
PORT=3002
BASE_URL=http://localhost:8080

# Database
POSTGRES_DB=urlshortener
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password_here

# Cache
REDIS_HOST=redis
REDIS_PORT=6379

# Portas do host
HOST_POSTGRES_PORT=5432
HOST_REDIS_PORT=6379
HOST_SERVICE_PORT=3002
HOST_GATEWAY_PORT=8080
```

### 2. Configuração do Docker

O projeto usa Docker Compose para orquestração dos serviços:

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### 3. Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev              # Modo desenvolvimento
npm run start:url-shortener    # Inicia apenas o serviço

# Build
npm run build:url-shortener-service  # Build do serviço

# Testes
npm test                       # Testes unitários
npm run test:cov              # Cobertura de testes
npm run test:e2e              # Testes E2E

# Database
npm run db:generate           # Gerar cliente Prisma
npm run db:push              # Push schema para DB
npm run db:migrate           # Rodar migrações
npm run db:studio            # Interface do Prisma

# Qualidade
npm run lint                 # ESLint
npm run format              # Prettier

# Docker
npm run docker:up           # docker-compose up
npm run docker:down         # docker-compose down
npm run docker:logs         # Ver logs
```

## 📚 API Documentation

Após iniciar o projeto, acesse:

- **Swagger UI**: http://localhost:8080/api/docs
- **API JSON**: http://localhost:8080/api/docs-json

## 🎯 Como Usar Corretamente

### 📝 Para Criar URLs e APIs

```bash
# Use sempre o Gateway na porta 8080
BASE_URL=http://localhost:8080
```

### 🔄 Para Redirects (Navegador)

```bash
# Use o serviço direto na porta 3002
REDIRECT_URL=http://localhost:3002/{shortCode}
```

### 💡 Exemplo Prático

1. **Criar URL encurtada**:

   ```bash
   curl -X POST http://localhost:8080/shorten \
     -H "Content-Type: application/json" \
     -d '{"originalUrl": "https://github.com/seu-usuario/projeto"}'
   ```

2. **Usar no navegador**:

   ```
   http://localhost:3002/aB3xY9
   ```

3. **Ver informações**:
   ```bash
   curl http://localhost:8080/info/aB3xY9
   ```

## 🔌 Endpoints

### 🌐 Via API Gateway (porta 8080)

#### Health Check

```http
GET http://localhost:8080/health
```

#### Encurtar URL

```http
POST http://localhost:8080/shorten
Content-Type: application/json

{
  "originalUrl": "https://example.com/very/long/url"
}
```

**Resposta:**

```json
{
  "shortCode": "aZbKq7",
  "shortUrl": "http://localhost:8080/aZbKq7",
  "originalUrl": "https://example.com/very/long/url"
}
```

#### Informações da URL

```http
GET http://localhost:8080/info/{shortCode}
```

### 🔄 Redirecionamento (porta 3002)

**⚠️ Importante**: Redirects funcionam **diretamente no serviço (porta 3002)** devido a limitações do KrakenD v2.5 com propagação de redirects HTTP.

```http
GET http://localhost:3002/{shortCode}
```

**Exemplo**:

- URL encurtada: `http://localhost:8080/7ToK5d`
- **Para redirecionamento**: `http://localhost:3002/7ToK5d`

**Resposta:**

```json
{
  "shortCode": "aZbKq7",
  "shortUrl": "http://localhost:8080/aZbKq7",
  "originalUrl": "https://example.com/very/long/url",
  "clickCount": 10,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Testes com cobertura
npm run test:cov

# Testes E2E
npm run test:e2e
```

## 🗄️ Database

### Schema

```prisma
model ShortUrl {
  id          String    @id @default(uuid())
  shortCode   String    @unique @db.VarChar(6)
  originalUrl String    @db.Text
  clickCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  clicks UrlClick[]
}

model UrlClick {
  id         String   @id @default(uuid())
  shortUrlId String
  ipAddress  String?  @db.VarChar(45)
  userAgent  String?  @db.Text
  referer    String?  @db.Text
  clickedAt  DateTime @default(now())

  shortUrl ShortUrl @relation(fields: [shortUrlId], references: [id])
}
```

## 🚀 Deploy

### Desenvolvimento Local

```bash
# Com Docker
docker-compose up -d

# Sem Docker (requer PostgreSQL e Redis locais)
npm run start:dev
```

### Produção

```bash
# Build
npm run build:url-shortener-service

# Start produção
NODE_ENV=production npm run start:prod
```

## 📋 Requisitos Atendidos

### ✅ Obrigatórios

- ✅ NestJS + TypeScript + PostgreSQL
- ✅ Docker-compose funcional
- ✅ Monorepo com microserviços
- ✅ API Gateway KrakenD
- ✅ Endpoint único para encurtar URLs
- ✅ URLs de máximo 6 caracteres
- ✅ Contabilização de cliques
- ✅ Swagger documentation

### ✅ Diferenciais Sênior

- ✅ **100% Test Coverage**
- ✅ Configuração com variáveis de ambiente
- ✅ Docker Compose completo
- ✅ Fastify para performance
- ✅ Prisma ORM
- ✅ Health checks
- ✅ Soft delete
- ✅ Monorepo estruturado
- ✅ Changelog documentado

## 🗺️ Roadmap

### 🎯 Release Atual - v0.1.0 ✅

- ✅ **Core URL Shortener**: Funcionalidade básica completa
- ✅ **API Gateway**: KrakenD configurado
- ✅ **Testes**: 100% cobertura (29 testes passando)
- ✅ **Docker**: Ambiente completo containerizado

### 🔄 Próximas Releases

#### **v0.2.0 - Identity Service** 🚧

- 🔐 **Autenticação JWT**
- 👤 **Registro e login de usuários**
- 🛡️ **Middleware de autenticação**
- 🆔 **Identity Service separado**

#### **v0.3.0 - URLs por Usuário** 📋

- 🔗 **CRUD de URLs para usuários autenticados**
- 📊 **Dashboard pessoal**
- 🗂️ **Organização por usuário**
- ⚙️ **Configurações de URL**

#### **v0.4.0 - Analytics** 📊

- 📈 **Métricas detalhadas de cliques**
- 🌍 **Geolocalização de acessos**
- 📱 **Detecção de dispositivos**
- 📊 **Dashboards visuais**

#### **v0.5.0 - Observabilidade** 🔍

- 🔍 **Logging estruturado**
- 📊 **Métricas Prometheus**
- 🚨 **Alertas e monitoramento**
- 🐛 **Distributed tracing**

#### **v1.0.0 - Produção** 🚀

- ☁️ **Deploy em Kubernetes**
- 🏗️ **CI/CD completo**
- 🛡️ **Segurança produção**
- 📈 **Escalabilidade horizontal**

## 📝 Changelog

Veja [CHANGELOG.md](./CHANGELOG.md) para histórico de mudanças.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

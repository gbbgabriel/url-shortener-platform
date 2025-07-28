# 🔗 URL Shortener Platform

**Release 0.2.0** - Plataforma completa de encurtamento de URLs com Identity Service, autenticação JWT e arquitetura de microserviços.

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
# 1. Testes Unitários (59 testes)
npm test

# 2. Subir banco de teste para E2E/Integration
docker-compose -f docker-compose.test.yml up -d

# 3. Aguardar banco de teste ficar pronto
sleep 10

# 4. Sincronizar schema no banco de teste
DATABASE_URL="postgresql://test_user:test_password@localhost:5433/test_db" npx prisma db push

# 5. Testes End-to-End (26 testes)
npm run test:e2e

# 6. Testes de Integração (17 testes)
npm run test:integration

# 7. Limpar ambiente de teste
docker-compose -f docker-compose.test.yml down
```

### 📊 Resumo dos Testes

| Tipo            | Quantidade     | Descrição                                   |
| --------------- | -------------- | ------------------------------------------- |
| **Unit**        | 74 testes      | Services, controllers, hash, validação      |
| **E2E**         | 34 testes      | APIs completas via HTTP (ambos os serviços) |
| **Integration** | 25 testes      | Banco de dados + serviços + autenticação    |
| **Total**       | **133 testes** | **100% dos cenários críticos cobertos**     |

### 🔍 Testes Manuais Críticos

Após subir a aplicação, execute estes testes manuais:

```bash
# 1. Health Check
curl http://localhost:8080/health

# 2. Registrar usuário
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"MinhaSenh@123"}'

# 3. Fazer login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"MinhaSenh@123"}'

# 4. Criar URL encurtada
curl -X POST http://localhost:8080/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://github.com/gbbgabriel/url-shortener-platform"}'

# 5. Testar redirecionamento (substitua SHORTCODE pelo retornado acima)
curl -I http://localhost:3002/SHORTCODE

# 6. Verificar informações e click tracking
curl http://localhost:8080/info/SHORTCODE

# 7. Verificar documentação unificada
open http://localhost:8080/docs
```

### 🚨 Troubleshooting

#### ❌ Containers não sobem

```bash
# Verificar se portas estão ocupadas
lsof -i :8080 -i :3001 -i :3002 -i :5432 -i :6379

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
- [ ] Registro e login de usuários funcionando
- [ ] URLs são criadas via `POST /shorten` com sucesso
- [ ] Redirects funcionam via `GET http://localhost:3002/CODE`
- [ ] Click tracking incrementa em `GET /info/CODE`
- [ ] **133/133 testes** passando (74 unit + 34 e2e + 25 integration)
- [ ] Documentation hub disponível em `http://localhost:8080/docs`
- [ ] Swagger individual: Identity (`http://localhost:3001/api/docs`) e URL Shortener (`http://localhost:3002/api/docs`)
- [ ] URLs inexistentes retornam **404**

## 🏗️ Arquitetura do Sistema

### 📊 Visão Geral

```mermaid
flowchart TD
    Client[👤 Cliente/Browser] --> Gateway{🎯 Operação?}

    Gateway -->|🔐 Autenticação| KrakenD[⚡ KrakenD Gateway :8080]
    Gateway -->|📝 Criar URLs| KrakenD
    Gateway -->|📊 Info URLs| KrakenD
    Gateway -->|💚 Health Check| KrakenD

    Gateway -->|🔄 Redirecionamento| URLService[🎯 URL Service :3002]
    Gateway -->|📚 Documentação| DocsHub[📚 Docs Hub]

    KrakenD --> IdentityService[🔐 Identity Service :3001]
    KrakenD --> URLService
    KrakenD --> DocsHub

    IdentityService --> DB[(🐘 PostgreSQL :5432)]
    URLService --> DB
    URLService --> Cache[(⚡ Redis :6379)]

    subgraph "🛡️ Recursos do Gateway"
        RL[Rate Limiting]
        CORS[CORS Headers]
        JWT[JWT Validation]
        LOG[Logging]
    end

    KrakenD --> RL
    KrakenD --> CORS
    KrakenD --> JWT
    KrakenD --> LOG

    subgraph "📋 APIs Implementadas"
        AUTH1[POST /auth/register]
        AUTH2[POST /auth/login]
        AUTH3[GET /auth/me]
        API1[POST /shorten]
        API2[GET /info/:code]
        API3[GET /health]
        API4[GET /:code → 301 Redirect]
        DOCS1[GET /docs → Hub]
    end
```

### 🔄 Fluxo de Dados por Operação

#### 1. **🔐 Autenticação de Usuário**

```
Cliente → KrakenD :8080 → Identity Service :3001 → PostgreSQL
                    ↓
          Rate Limiting + CORS + JWT
```

#### 2. **📝 Criar URL Encurtada**

```
Cliente → KrakenD :8080 → URL Service :3002 → PostgreSQL
                    ↓
               Rate Limiting + CORS
```

#### 3. **📊 Obter Informações**

```
Cliente → KrakenD :8080 → URL Service :3002 → PostgreSQL
                    ↓
               Cache + Validação
```

#### 4. **🔄 Redirecionamento (DIRETO)**

```
Cliente → URL Service :3002 → PostgreSQL → HTTP 301 Redirect
             ↓
        Contabiliza Click
```

#### 5. **📚 Documentação Híbrida**

```
Cliente → KrakenD :8080 → Nginx Docs Server → HTML Hub
                    ↓
            Links para Swagger individuais
```

### ⚠️ Arquitetura Híbrida - Por que?

#### **🎯 Problema Técnico Identificado:**

- **KrakenD v2.5** não propaga redirects HTTP 301/302 corretamente
- O gateway intercepta os redirects e retorna HTML em vez de redirecionar

#### **✅ Solução Implementada:**

- **Gateway (8080)**: Todas as operações de API (autenticação, criar, info, health)
- **Serviço Direto (3002)**: Apenas redirects para melhor performance
- **Documentation Hub**: Sistema híbrido com Nginx para documentação unificada

#### **🚀 Benefícios da Arquitetura:**

1. **JWT Authentication**: Proteção de rotas via gateway
2. **Rate Limiting**: Protege contra spam na criação de URLs
3. **CORS**: Headers corretos para browsers
4. **Logging**: Centralizado no gateway
5. **Performance**: Redirects diretos sem overhead
6. **Escalabilidade**: Preparado para múltiplos serviços
7. **Documentation**: Hub centralizado + documentação individual

### 🎯 Portas e Serviços

| Serviço              | Porta | Propósito          | Acesso            | Status    |
| -------------------- | ----- | ------------------ | ----------------- | --------- |
| **KrakenD Gateway**  | 8080  | API Management     | Público           | ✅ v0.2.0 |
| **Identity Service** | 3001  | JWT Authentication | Interno           | ✅ v0.2.0 |
| **URL Shortener**    | 3002  | Core Logic         | Interno/Redirects | ✅ v0.1.0 |
| **Docs Hub Server**  | 80    | Documentation Hub  | Via Gateway       | ✅ v0.2.0 |
| **PostgreSQL**       | 5432  | Database           | Interno           | ✅ v0.1.0 |
| **Redis**            | 6379  | Cache Layer        | Interno           | ✅ v0.1.0 |
| **Test Database**    | 5433  | Testing Only       | CI/CD             | ✅ v0.1.0 |

## 🚀 Tecnologias

### 🏗️ Core Stack

- **Backend Framework**: NestJS 11+ com TypeScript 5+
- **HTTP Server**: Fastify (alta performance)
- **Authentication**: JWT + Passport.js + bcryptjs
- **Database**: PostgreSQL 15 + Prisma ORM 6+
- **Cache Layer**: Redis 7
- **API Gateway**: KrakenD 2.5 com rate limiting
- **Documentation**: Swagger/OpenAPI 3.0 + Nginx
- **Infrastructure**: Docker Compose multi-service

### 🛡️ Security & Validation

- **Password Hashing**: bcryptjs com salt automático
- **JWT Tokens**: Configurável com expiração de 24h
- **Input Validation**: class-validator + class-transformer
- **Rate Limiting**: KrakenD com limites por endpoint
- **CORS**: Headers configurados para autenticação

### 🧪 Testing & Quality

- **Testing Framework**: Jest com coverage completa
- **E2E Testing**: Supertest com banco de teste
- **Linting**: ESLint + Prettier com regras rigorosas
- **TypeScript**: Modo strict com validação total

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

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRATION=24h

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
HOST_IDENTITY_PORT=3001
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
npm run start:url-shortener    # Inicia apenas o URL service
npm run start:identity         # Inicia apenas o Identity service

# Build
npm run build:identity-service        # Build do Identity service
npm run build:url-shortener-service  # Build do URL service

# Testes
npm test                       # Testes unitários
npm run test:cov              # Cobertura de testes
npm run test:e2e              # Testes E2E
npm run test:integration      # Testes de integração

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

### 🎯 Documentation Hub (Novo em 0.2.0)

Acesse o hub central de documentação:

- **Documentation Hub**: http://localhost:8080/docs

### 📖 Swagger Individual

Cada serviço mantém sua documentação própria:

- **Identity Service**: http://localhost:3001/api/docs
- **URL Shortener Service**: http://localhost:3002/api/docs

### 📄 JSON Schemas

- **Identity JSON**: http://localhost:8080/docs/identity
- **URL Shortener JSON**: http://localhost:8080/docs/url-shortener

## 🎯 Como Usar Corretamente

### 🔐 Para Autenticação

```bash
# Use sempre o Gateway na porta 8080
BASE_URL=http://localhost:8080

# Registrar
curl -X POST http://localhost:8080/auth/register

# Login
curl -X POST http://localhost:8080/auth/login

# Perfil (com token)
curl -H "Authorization: Bearer TOKEN" http://localhost:8080/auth/me
```

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

### 💡 Exemplo Prático Completo

1. **Registrar usuário**:

   ```bash
   curl -X POST http://localhost:8080/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"usuario@example.com","password":"MinhaSenh@123"}'
   ```

2. **Fazer login**:

   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"usuario@example.com","password":"MinhaSenh@123"}'
   ```

3. **Criar URL encurtada**:

   ```bash
   curl -X POST http://localhost:8080/shorten \
     -H "Content-Type: application/json" \
     -d '{"originalUrl": "https://github.com/seu-usuario/projeto"}'
   ```

4. **Usar no navegador**:

   ```
   http://localhost:3002/aB3xY9
   ```

5. **Ver informações**:
   ```bash
   curl http://localhost:8080/info/aB3xY9
   ```

## 🔌 Endpoints

### 🔐 Authentication (via Gateway - porta 8080)

#### Registrar Usuário

```http
POST http://localhost:8080/auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "MinhaSenh@123"
}
```

**Resposta:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "tokenType": "Bearer",
  "user": {
    "id": "uuid-here",
    "email": "usuario@example.com",
    "isActive": true,
    "createdAt": "2025-01-27T10:00:00.000Z",
    "updatedAt": "2025-01-27T10:00:00.000Z"
  }
}
```

#### Login

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "MinhaSenh@123"
}
```

#### Perfil do Usuário

```http
GET http://localhost:8080/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 🌐 URL Shortener (via Gateway - porta 8080)

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
  "shortUrl": "http://localhost:3002/aZbKq7",
  "originalUrl": "https://example.com/very/long/url"
}
```

#### Informações da URL

```http
GET http://localhost:8080/info/{shortCode}
```

**Resposta:**

```json
{
  "shortCode": "aZbKq7",
  "shortUrl": "http://localhost:3002/aZbKq7",
  "originalUrl": "https://example.com/very/long/url",
  "clickCount": 10,
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```

### 🔄 Redirecionamento (porta 3002)

**⚠️ Importante**: Redirects funcionam **diretamente no serviço (porta 3002)** devido a limitações do KrakenD v2.5 com propagação de redirects HTTP.

```http
GET http://localhost:3002/{shortCode}
```

**Exemplo**:

- URL encurtada: `http://localhost:8080/aZbKq7`
- **Para redirecionamento**: `http://localhost:3002/aZbKq7`

## 🧪 Testes

```bash
# Rodar todos os testes unitários
npm test

# Testes com cobertura
npm run test:cov

# Testes E2E
npm run test:e2e

# Testes de integração
npm run test:integration
```

## 🗄️ Database

### Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model ShortUrl {
  id          String    @id @default(uuid())
  shortCode   String    @unique @db.VarChar(6)
  originalUrl String    @db.Text
  clickCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  clicks UrlClick[]

  @@map("short_urls")
}

model UrlClick {
  id         String   @id @default(uuid())
  shortUrlId String
  ipAddress  String?  @db.VarChar(45)
  userAgent  String?  @db.Text
  referer    String?  @db.Text
  clickedAt  DateTime @default(now())

  shortUrl ShortUrl @relation(fields: [shortUrlId], references: [id])

  @@map("url_clicks")
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
# Build de ambos os serviços
npm run build:identity-service
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

- ✅ **133 testes passando** (100% Test Coverage críticos)
- ✅ **Microservices Architecture** completa (Identity + URL Services)
- ✅ **JWT Authentication** com Passport e estratégias
- ✅ **API Gateway KrakenD** com rate limiting avançado
- ✅ **Documentation Hub** híbrido com Nginx
- ✅ **Database Relations** User-ShortUrl com soft delete
- ✅ **Hash Service** com bcryptjs para senhas
- ✅ **Custom Decorators** (@CurrentUser)
- ✅ **Guards e Strategies** JWT implementados
- ✅ **Validation Pipes** com class-validator
- ✅ **Docker Multi-Service** (7 containers)
- ✅ **Health Checks** individuais por serviço
- ✅ **Rate Limiting** diferenciado por endpoint
- ✅ **Fastify** para alta performance
- ✅ **Monorepo NestJS** bem estruturado
- ✅ **Changelog** detalhado com versionamento

## 🗺️ Roadmap

### 🎯 Release Atual - v0.2.0 ✅

- ✅ **Identity Service**: Microserviço de autenticação completo
- ✅ **JWT Authentication**: Login, registro, proteção de rotas
- ✅ **User Management**: Gerenciamento completo de usuários
- ✅ **API Gateway**: KrakenD com rate limiting e validação JWT
- ✅ **Documentation Hub**: Sistema híbrido com Nginx
- ✅ **Database Schema**: Relacionamento User-ShortUrl implementado
- ✅ **Testing Suite**: 133 testes passando (74+34+25)
- ✅ **Docker Architecture**: Ambiente completo com 7 serviços

### 🔄 Próximas Releases

#### **v0.3.0 - URLs por Usuário** 📋

- 🔗 **CRUD de URLs para usuários autenticados**
  - `GET /my-urls` - Listar URLs do usuário
  - `PUT /my-urls/:id` - Editar URL existente
  - `DELETE /my-urls/:id` - Deletar URL do usuário
- 📊 **Dashboard pessoal de URLs**
- 🗂️ **Organização por usuário**
- ⚙️ **Configurações avançadas de URL**
- 🔒 **URLs privadas vs públicas**

#### **v0.4.0 - Analytics Avançado** 📊

- 📈 **Métricas detalhadas de cliques**
- 🌍 **Geolocalização de acessos**
- 📱 **Detecção de dispositivos**
- 📊 **Dashboards visuais**
- 📅 **Relatórios temporais**

#### **v0.5.0 - Observabilidade** 🔍

- 🔍 **Logging estruturado**
- 📊 **Métricas Prometheus**
- 🚨 **Alertas e monitoramento**
- 🐛 **Distributed tracing**
- 🏥 **Health checks avançados**

#### **v1.0.0 - Produção** 🚀

- ☁️ **Deploy em Kubernetes**
- 🏗️ **CI/CD completo**
- 🛡️ **Segurança produção**
- 📈 **Escalabilidade horizontal**
- 🌐 **CDN e cache distribuído**

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

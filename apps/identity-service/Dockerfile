# =======================================================
# Multi-stage Dockerfile - Identity Service
# =======================================================

# Build stage
FROM node:22.17.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY apps/identity-service ./apps/identity-service
COPY libs ./libs
COPY prisma ./prisma

# Generate Prisma client
RUN npm run db:generate

# Build the application
RUN npm run build:identity-service

# Production stage
FROM node:22.17.1-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm install && npm cache clean --force

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/identity-service ./dist/apps/identity-service

# Copy startup script
COPY apps/identity-service/startup.sh ./startup.sh

# Set permissions
RUN chown -R nestjs:nodejs /app && \
    chmod +x ./startup.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["./startup.sh"] 
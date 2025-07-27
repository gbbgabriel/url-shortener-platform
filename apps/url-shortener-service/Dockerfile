# =======================================================
# URL Shortener Service - Dockerfile (Release 0.1.0)
# =======================================================

# Build stage
FROM node:22.17.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY apps/url-shortener-service ./apps/url-shortener-service
COPY libs ./libs
COPY prisma ./prisma

# Generate Prisma client
RUN npm run db:generate

# Build the application
RUN npm run build:url-shortener-service

# Production stage
FROM node:22.17.1-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files for production install
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy prisma schema for client generation
COPY prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy startup script
COPY apps/url-shortener-service/startup.sh ./startup.sh

# Change ownership of all files to non-root user and make startup script executable
RUN chown -R nestjs:nodejs /app && \
    chmod +x ./startup.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the application with automated database sync
CMD ["./startup.sh"] 
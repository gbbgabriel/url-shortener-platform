import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

export interface LogContext {
  correlationId?: string;
  service?: string;
  operation?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  shortCode?: string;
  originalUrl?: string;
  clickCount?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Allow additional properties
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: LogContext) {
    this.logger.info(message, {
      level: 'info',
      context: context || {},
    });
  }

  error(message: string, error?: unknown, context?: LogContext) {
    this.logger.error(message, {
      level: 'error',
      error: error instanceof Error ? error.stack : String(error),
      context: context || {},
    });
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, {
      level: 'warn',
      context: context || {},
    });
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, {
      level: 'debug',
      context: context || {},
    });
  }

  verbose(message: string, context?: LogContext) {
    this.logger.verbose(message, {
      level: 'verbose',
      context: context || {},
    });
  }

  // Business metrics logging
  logUrlCreated(urlId: string, userId?: string, context?: LogContext) {
    this.log('URL created', {
      ...context,
      operation: 'url_created',
      metadata: { urlId, userId },
    });
  }

  logUrlClicked(shortCode: string, context?: LogContext) {
    this.log('URL clicked', {
      ...context,
      operation: 'url_clicked',
      metadata: { shortCode },
    });
  }

  logUserRegistered(userId: string, context?: LogContext) {
    this.log('User registered', {
      ...context,
      operation: 'user_registered',
      metadata: { userId },
    });
  }

  logUserLogin(userId: string, context?: LogContext) {
    this.log('User login', {
      ...context,
      operation: 'user_login',
      metadata: { userId },
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: LogContext) {
    this.log(`Operation completed: ${operation}`, {
      ...context,
      operation,
      duration,
    });
  }
}

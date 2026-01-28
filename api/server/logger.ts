/**
 * Logger Estruturado - Pino
 * 
 * Logs estruturados em JSON para produção, formatados para desenvolvimento.
 * Facilita análise, debugging e integração com ferramentas de observabilidade.
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

// Configuração do logger
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  
  // Formatação bonita apenas em desenvolvimento
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
  
  // Campos base em todos os logs
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'souesporte-api',
  },
  
  // Formatação de timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Redação de campos sensíveis
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
    ],
    censor: '[REDACTED]',
  },
});

// ============================================
// HELPERS DE LOG
// ============================================

/**
 * Log de requisição HTTP
 */
export function logRequest(req: {
  method: string;
  url: string;
  ip?: string;
  userId?: number;
}) {
  logger.info({
    type: 'http_request',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId,
  }, `${req.method} ${req.url}`);
}

/**
 * Log de resposta HTTP
 */
export function logResponse(req: {
  method: string;
  url: string;
}, res: {
  statusCode: number;
}, responseTime: number) {
  const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
  
  logger[level]({
    type: 'http_response',
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime,
  }, `${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`);
}

/**
 * Log de erro
 */
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, error.message);
}

/**
 * Log de autenticação
 */
export function logAuth(action: 'login' | 'logout' | 'register' | 'failed', userId?: number, details?: Record<string, unknown>) {
  const level = action === 'failed' ? 'warn' : 'info';
  
  logger[level]({
    type: 'auth',
    action,
    userId,
    ...details,
  }, `Auth ${action}${userId ? ` for user ${userId}` : ''}`);
}

/**
 * Log de rate limit
 */
export function logRateLimit(ip: string, endpoint: string, remaining: number) {
  logger.warn({
    type: 'rate_limit',
    ip,
    endpoint,
    remaining,
  }, `Rate limit warning: ${ip} on ${endpoint} (${remaining} remaining)`);
}

/**
 * Log de rate limit excedido
 */
export function logRateLimitExceeded(ip: string, endpoint: string) {
  logger.error({
    type: 'rate_limit_exceeded',
    ip,
    endpoint,
  }, `Rate limit exceeded: ${ip} on ${endpoint}`);
}

/**
 * Log de cache
 */
export function logCache(action: 'hit' | 'miss' | 'set' | 'invalidate', key: string, ttl?: number) {
  logger.debug({
    type: 'cache',
    action,
    key,
    ttl,
  }, `Cache ${action}: ${key}`);
}

/**
 * Log de banco de dados
 */
export function logDatabase(action: string, table: string, duration?: number, rowCount?: number) {
  logger.debug({
    type: 'database',
    action,
    table,
    duration,
    rowCount,
  }, `DB ${action} on ${table}${duration ? ` (${duration}ms)` : ''}`);
}

/**
 * Log de evento de negócio
 */
export function logBusinessEvent(event: string, data: Record<string, unknown>) {
  logger.info({
    type: 'business_event',
    event,
    ...data,
  }, `Business event: ${event}`);
}

/**
 * Log de performance
 */
export function logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>) {
  const level = duration > 1000 ? 'warn' : 'debug';
  
  logger[level]({
    type: 'performance',
    operation,
    duration,
    ...metadata,
  }, `${operation} took ${duration}ms`);
}

export default logger;

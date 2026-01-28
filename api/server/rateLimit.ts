/**
 * Rate Limiting - Proteção contra abuso
 * 
 * Limita requisições por IP para prevenir:
 * - Ataques de força bruta
 * - DDoS
 * - Scraping excessivo
 * - Abuso de API
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logRateLimitExceeded } from './logger';

// ============================================
// CONFIGURAÇÕES
// ============================================

// Em desenvolvimento, usar limites mais altos
const isDev = process.env.NODE_ENV === 'development';

const RATE_LIMITS = {
  // Limite global: 1000 requisições por minuto em dev, 100 em prod
  global: {
    windowMs: 60 * 1000, // 1 minuto
    max: isDev ? 1000 : 100,
    message: 'Muitas requisições. Tente novamente em 1 minuto.',
  },
  
  // Limite para autenticação: 50 tentativas por 15 minutos em dev
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDev ? 50 : 10,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  
  // Limite para registro: 50 por hora em dev
  register: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: isDev ? 50 : 5,
    message: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
  },
  
  // Limite para criação de eventos: 100 por hora em dev
  createEvent: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: isDev ? 100 : 20,
    message: 'Limite de criação de eventos atingido. Tente novamente em 1 hora.',
  },
  
  // Limite para inscrições: 100 por hora em dev
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: isDev ? 100 : 30,
    message: 'Limite de inscrições atingido. Tente novamente em 1 hora.',
  },
  
  // Limite para busca: 500 por minuto em dev
  search: {
    windowMs: 60 * 1000, // 1 minuto
    max: isDev ? 500 : 60,
    message: 'Muitas buscas. Aguarde um momento.',
  },
  
  // Limite para upload: 50 por hora em dev
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: isDev ? 50 : 10,
    message: 'Limite de uploads atingido. Tente novamente em 1 hora.',
  },
};

// ============================================
// HELPERS
// ============================================

/**
 * Handler padrão para rate limit excedido
 */
function createRateLimitHandler(limitName: string) {
  return (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    logRateLimitExceeded(ip, `${limitName}:${req.path}`);
    
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: RATE_LIMITS[limitName as keyof typeof RATE_LIMITS]?.message || 'Limite de requisições excedido.',
      },
    });
  };
}

// ============================================
// MIDDLEWARES DE RATE LIMIT
// ============================================

/**
 * Rate limit global - aplica a todas as rotas
 */
export const globalRateLimit = rateLimit({
  windowMs: RATE_LIMITS.global.windowMs,
  max: RATE_LIMITS.global.max,
  standardHeaders: true, // Retorna headers RateLimit-*
  legacyHeaders: false, // Desabilita headers X-RateLimit-*
  handler: createRateLimitHandler('global'),
  skip: (req) => {
    // Skip para health checks e assets estáticos
    return req.path === '/health' || 
           req.path === '/api/health' ||
           req.path.startsWith('/@vite') ||
           req.path.startsWith('/node_modules') ||
           req.path.endsWith('.js') ||
           req.path.endsWith('.css') ||
           req.path.endsWith('.png') ||
           req.path.endsWith('.jpg') ||
           req.path.endsWith('.svg') ||
           req.path.endsWith('.ico') ||
           req.path.endsWith('.woff') ||
           req.path.endsWith('.woff2');
  },
});

/**
 * Rate limit para autenticação (login)
 */
export const authRateLimit = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('auth'),
});

/**
 * Rate limit para registro de usuários
 */
export const registerRateLimit = rateLimit({
  windowMs: RATE_LIMITS.register.windowMs,
  max: RATE_LIMITS.register.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('register'),
});

/**
 * Rate limit para criação de eventos
 */
export const createEventRateLimit = rateLimit({
  windowMs: RATE_LIMITS.createEvent.windowMs,
  max: RATE_LIMITS.createEvent.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('createEvent'),
});

/**
 * Rate limit para inscrições
 */
export const registrationRateLimit = rateLimit({
  windowMs: RATE_LIMITS.registration.windowMs,
  max: RATE_LIMITS.registration.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('registration'),
});

/**
 * Rate limit para buscas
 */
export const searchRateLimit = rateLimit({
  windowMs: RATE_LIMITS.search.windowMs,
  max: RATE_LIMITS.search.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('search'),
});

/**
 * Rate limit para uploads
 */
export const uploadRateLimit = rateLimit({
  windowMs: RATE_LIMITS.upload.windowMs,
  max: RATE_LIMITS.upload.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('upload'),
});

// ============================================
// RATE LIMIT DINÂMICO
// ============================================

/**
 * Cria um rate limiter customizado
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  name?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const ip = req.ip || 'unknown';
      logRateLimitExceeded(ip, `${options.name || 'custom'}:${req.path}`);
      
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Limite de requisições excedido.',
        },
      });
    },
  });
}

export default {
  global: globalRateLimit,
  auth: authRateLimit,
  register: registerRateLimit,
  createEvent: createEventRateLimit,
  registration: registrationRateLimit,
  search: searchRateLimit,
  upload: uploadRateLimit,
};

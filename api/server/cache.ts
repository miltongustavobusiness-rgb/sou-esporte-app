/**
 * Cache Service - Abstração para cache in-memory
 * 
 * ARQUITETURA PREPARADA PARA MIGRAÇÃO:
 * Atualmente usa node-cache (in-memory).
 * Para migrar para Redis (Upstash), basta trocar a implementação abaixo.
 * 
 * MIGRAÇÃO FUTURA:
 * 1. Criar conta em https://upstash.com
 * 2. Instalar: pnpm add @upstash/redis
 * 3. Adicionar UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN no .env
 * 4. Descomentar implementação Redis e comentar node-cache
 */

import NodeCache from 'node-cache';

// ============================================
// INTERFACE (não muda na migração)
// ============================================

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  keys(): Promise<string[]>;
  stats(): { hits: number; misses: number; keys: number };
}

// ============================================
// IMPLEMENTAÇÃO: node-cache (in-memory)
// ============================================

const cache = new NodeCache({
  stdTTL: 60, // TTL padrão: 60 segundos
  checkperiod: 120, // Verificar expiração a cada 2 minutos
  useClones: false, // Performance: não clonar objetos
});

// Estatísticas
let hits = 0;
let misses = 0;

export const cacheService: CacheService = {
  async get<T>(key: string): Promise<T | null> {
    const value = cache.get<T>(key);
    if (value !== undefined) {
      hits++;
      return value;
    }
    misses++;
    return null;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      cache.set(key, value, ttlSeconds);
    } else {
      cache.set(key, value);
    }
  },

  async del(key: string): Promise<void> {
    cache.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const allKeys = cache.keys();
    const matchingKeys = allKeys.filter(k => k.includes(pattern));
    matchingKeys.forEach(k => cache.del(k));
  },

  async keys(): Promise<string[]> {
    return cache.keys();
  },

  stats() {
    return {
      hits,
      misses,
      keys: cache.keys().length,
    };
  },
};

// ============================================
// IMPLEMENTAÇÃO FUTURA: Upstash Redis
// ============================================
/*
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let hits = 0;
let misses = 0;

export const cacheService: CacheService = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get<T>(key);
    if (value !== null) {
      hits++;
      return value;
    }
    misses++;
    return null;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  async keys(): Promise<string[]> {
    return redis.keys('*');
  },

  stats() {
    return { hits, misses, keys: -1 }; // keys count requer chamada async
  },
};
*/

// ============================================
// CACHE KEYS - Padronização de chaves
// ============================================

export const CACHE_KEYS = {
  // Eventos em alta (feed principal)
  HIGHLIGHTS: 'highlights',
  HIGHLIGHTS_TOP: (limit: number) => `highlights:top:${limit}`,
  
  // Evento individual
  EVENT: (id: number) => `event:${id}`,
  EVENT_DETAILS: (id: number) => `event:${id}:details`,
  EVENT_CATEGORIES: (id: number) => `event:${id}:categories`,
  
  // Contadores
  EVENT_VIEW_COUNT: (id: number) => `event:${id}:views`,
  EVENT_LIKES_COUNT: (id: number) => `event:${id}:likes`,
  EVENT_SUBSCRIBERS_COUNT: (id: number) => `event:${id}:subscribers`,
  
  // Listagens
  EVENTS_LIST: (filters: string) => `events:list:${filters}`,
  EVENTS_BY_CITY: (city: string, state: string) => `events:city:${state}:${city}`,
  
  // Usuário
  USER_PROFILE: (id: number) => `user:${id}:profile`,
  USER_FAVORITES: (id: number) => `user:${id}:favorites`,
  USER_REGISTRATIONS: (id: number) => `user:${id}:registrations`,
  
  // Organizador
  ORGANIZER_EVENTS: (id: number) => `organizer:${id}:events`,
  ORGANIZER_STATS: (id: number) => `organizer:${id}:stats`,
};

// ============================================
// TTL PADRÕES (em segundos)
// ============================================

export const CACHE_TTL = {
  // Feeds e listagens (atualizam frequentemente)
  HIGHLIGHTS: 60, // 1 minuto
  EVENTS_LIST: 30, // 30 segundos
  
  // Detalhes de evento (menos frequente)
  EVENT_DETAILS: 300, // 5 minutos
  EVENT_CATEGORIES: 600, // 10 minutos
  
  // Contadores (curto, mas evita spam)
  COUNTERS: 10, // 10 segundos
  
  // Perfil de usuário
  USER_PROFILE: 300, // 5 minutos
  USER_FAVORITES: 60, // 1 minuto
  
  // Estatísticas do organizador
  ORGANIZER_STATS: 120, // 2 minutos
};

// ============================================
// HELPERS
// ============================================

/**
 * Cache-aside pattern: busca no cache, se não tiver, executa função e salva
 */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Tenta buscar do cache
  const cached = await cacheService.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Não está no cache, busca da fonte
  const data = await fetchFn();
  
  // Salva no cache
  await cacheService.set(key, data, ttlSeconds);
  
  return data;
}

/**
 * Invalida cache relacionado a um evento
 */
export async function invalidateEventCache(eventId: number): Promise<void> {
  await cacheService.del(CACHE_KEYS.EVENT(eventId));
  await cacheService.del(CACHE_KEYS.EVENT_DETAILS(eventId));
  await cacheService.del(CACHE_KEYS.EVENT_CATEGORIES(eventId));
  await cacheService.invalidatePattern('highlights');
  await cacheService.invalidatePattern('events:list');
}

/**
 * Invalida cache relacionado a um usuário
 */
export async function invalidateUserCache(userId: number): Promise<void> {
  await cacheService.del(CACHE_KEYS.USER_PROFILE(userId));
  await cacheService.del(CACHE_KEYS.USER_FAVORITES(userId));
  await cacheService.del(CACHE_KEYS.USER_REGISTRATIONS(userId));
}

export default cacheService;

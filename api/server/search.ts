/**
 * Search Service - Optimized LIKE-based search
 * 
 * Implements efficient text search using LIKE with proper indexing.
 * Prepared for future migration to Meilisearch when scaling.
 * 
 * FUTURE MIGRATION NOTE:
 * When ready to migrate to Meilisearch:
 * 1. Create Meilisearch Cloud account or self-host
 * 2. Configure MEILISEARCH_URL and MEILISEARCH_API_KEY
 * 3. Replace searchEvents() implementation with Meilisearch client
 * 4. Set up sync job to keep Meilisearch index updated
 */

import { getDb } from "./db";
import { events } from "../drizzle/schema";
import { sql, and, or, eq, gte, like, desc, asc } from "drizzle-orm";
import { logger } from "./logger";
import { cacheService } from "./cache";

// ============================================
// CONFIGURAÇÃO
// ============================================

const SEARCH_CONFIG = {
  // Cache TTL para resultados de busca
  cacheTTL: 30, // 30 segundos
  
  // Limite máximo de resultados
  maxResults: 100,
  
  // Limite padrão
  defaultLimit: 20,
  
  // Campos pesquisáveis e seus pesos (para ranking manual)
  searchableFields: {
    name: 10,
    description: 5,
    city: 8,
    state: 6,
    startLocation: 7,
  },
};

// ============================================
// TIPOS
// ============================================

export interface SearchParams {
  query: string;
  filters?: {
    eventType?: string;
    city?: string;
    state?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    priceMin?: number;
    priceMax?: number;
  };
  sort?: 'relevance' | 'date' | 'price' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  events: any[];
  total: number;
  query: string;
  took: number; // tempo em ms
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Normaliza texto para busca (remove acentos, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

/**
 * Divide query em termos de busca
 */
function parseSearchTerms(query: string): string[] {
  return normalizeText(query)
    .split(/\s+/)
    .filter(term => term.length >= 2); // Ignora termos muito curtos
}

/**
 * Calcula score de relevância para um evento
 */
function calculateRelevanceScore(event: any, terms: string[]): number {
  let score = 0;
  const weights = SEARCH_CONFIG.searchableFields;
  
  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    
    // Nome
    if (event.name && normalizeText(event.name).includes(normalizedTerm)) {
      score += weights.name;
      // Bônus para match exato no início
      if (normalizeText(event.name).startsWith(normalizedTerm)) {
        score += 5;
      }
    }
    
    // Descrição
    if (event.description && normalizeText(event.description).includes(normalizedTerm)) {
      score += weights.description;
    }
    
    // Cidade
    if (event.city && normalizeText(event.city).includes(normalizedTerm)) {
      score += weights.city;
    }
    
    // Estado
    if (event.state && normalizeText(event.state).includes(normalizedTerm)) {
      score += weights.state;
    }
    
    // Local
    if (event.startLocation && normalizeText(event.startLocation).includes(normalizedTerm)) {
      score += weights.startLocation;
    }
  }
  
  // Bônus para eventos próximos
  if (event.eventDate) {
    const daysUntil = (new Date(event.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil > 0 && daysUntil <= 30) {
      score += Math.max(0, 10 - daysUntil / 3);
    }
  }
  
  return score;
}

// ============================================
// BUSCA PRINCIPAL
// ============================================

/**
 * Busca eventos com filtros e ordenação
 */
export async function searchEvents(params: SearchParams): Promise<SearchResult> {
  const startTime = Date.now();
  const { 
    query, 
    filters = {}, 
    sort = 'relevance', 
    sortOrder = 'desc',
    limit = SEARCH_CONFIG.defaultLimit,
    offset = 0 
  } = params;
  
  // Validar limite
  const safeLimit = Math.min(limit, SEARCH_CONFIG.maxResults);
  
  // Cache key
  const cacheKey = `search:${JSON.stringify({ query, filters, sort, sortOrder, limit: safeLimit, offset })}`;
  
  // Tentar cache
  const cached = await cacheService.get<SearchResult>(cacheKey);
  if (cached) {
    return { ...cached, took: Date.now() - startTime };
  }
  
  const db = await getDb();
  if (!db) {
    return { events: [], total: 0, query, took: Date.now() - startTime };
  }
  
  try {
    // Parsear termos de busca
    const terms = parseSearchTerms(query);
    
    if (terms.length === 0) {
      return { events: [], total: 0, query, took: Date.now() - startTime };
    }
    
    // Construir condições de busca
    const searchConditions = terms.map(term => {
      const likeTerm = `%${term}%`;
      return or(
        like(events.name, likeTerm),
        like(events.description, likeTerm),
        like(events.city, likeTerm),
        like(events.state, likeTerm),
        like(events.startLocation, likeTerm)
      );
    });
    
    // Construir condições de filtro
    const filterConditions: any[] = [
      eq(events.status, 'published'), // Apenas eventos publicados
    ];
    
    if (filters.eventType) {
      filterConditions.push(eq(events.eventType, filters.eventType as any));
    }
    
    if (filters.city) {
      filterConditions.push(like(events.city, `%${filters.city}%`));
    }
    
    if (filters.state) {
      filterConditions.push(eq(events.state, filters.state));
    }
    
    if (filters.dateFrom) {
      filterConditions.push(gte(events.eventDate, filters.dateFrom));
    }
    
    // Combinar todas as condições
    const allConditions = and(
      ...filterConditions,
      and(...searchConditions)
    );
    
    // Buscar eventos
    const results = await db
      .select()
      .from(events)
      .where(allConditions)
      .limit(safeLimit * 3); // Buscar mais para permitir ranking
    
    // Calcular relevância e ordenar
    const scoredResults = results.map((event: any) => ({
      ...event,
      _relevanceScore: calculateRelevanceScore(event, terms),
    }));
    
    // Ordenar
    let sortedResults: any[];
    switch (sort) {
      case 'relevance':
        sortedResults = scoredResults.sort((a: any, b: any) => 
          sortOrder === 'desc' 
            ? b._relevanceScore - a._relevanceScore 
            : a._relevanceScore - b._relevanceScore
        );
        break;
      case 'date':
        sortedResults = scoredResults.sort((a: any, b: any) => {
          const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
          const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        break;
      case 'price':
        sortedResults = scoredResults.sort((a: any, b: any) => {
          const priceA = parseFloat(a.basePrice) || 0;
          const priceB = parseFloat(b.basePrice) || 0;
          return sortOrder === 'desc' ? priceB - priceA : priceA - priceB;
        });
        break;
      case 'popularity':
        sortedResults = scoredResults.sort((a: any, b: any) => {
          const popA = (a.viewCount || 0) + (a.registrationCount || 0) * 10;
          const popB = (b.viewCount || 0) + (b.registrationCount || 0) * 10;
          return sortOrder === 'desc' ? popB - popA : popA - popB;
        });
        break;
      default:
        sortedResults = scoredResults;
    }
    
    // Aplicar paginação
    const paginatedResults = sortedResults.slice(offset, offset + safeLimit);
    
    // Remover score interno do resultado
    const cleanResults = paginatedResults.map(({ _relevanceScore, ...event }: any) => event);
    
    const result: SearchResult = {
      events: cleanResults,
      total: sortedResults.length,
      query,
      took: Date.now() - startTime,
    };
    
    // Cachear resultado
    await cacheService.set(cacheKey, result, SEARCH_CONFIG.cacheTTL);
    
    logger.info({ 
      query, 
      terms, 
      resultsCount: cleanResults.length, 
      totalMatches: sortedResults.length,
      took: result.took,
    }, `Search completed`);
    
    return result;
  } catch (error) {
    logger.error({ error, query }, `Search failed`);
    throw error;
  }
}

/**
 * Sugestões de busca (autocomplete)
 */
export async function getSearchSuggestions(prefix: string, limit: number = 5): Promise<string[]> {
  if (prefix.length < 2) {
    return [];
  }
  
  const cacheKey = `search:suggestions:${prefix}`;
  
  const cached = await cacheService.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const db = await getDb();
  if (!db) {
    return [];
  }
  
  try {
    const normalizedPrefix = normalizeText(prefix);
    
    // Buscar títulos que começam com o prefixo
    const results = await db
      .select({ name: events.name })
      .from(events)
      .where(
        and(
          eq(events.status, 'published'),
          like(events.name, `${normalizedPrefix}%`)
        )
      )
      .limit(limit);
    
    const suggestions = results
      .map((r: any) => r.name)
      .filter((name: string | null): name is string => name !== null);
    
    await cacheService.set(cacheKey, suggestions, 60); // Cache por 1 minuto
    
    return suggestions;
  } catch (error) {
    logger.error({ error, prefix }, `Failed to get search suggestions`);
    return [];
  }
}

export default {
  searchEvents,
  getSearchSuggestions,
};

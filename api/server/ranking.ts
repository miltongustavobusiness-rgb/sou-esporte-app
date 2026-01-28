/**
 * Ranking Service - Pre-calculated event rankings
 * 
 * Calculates and caches event popularity scores to avoid
 * expensive real-time calculations on every request.
 * 
 * Score formula:
 * - Base: registrations * 10 + views * 0.1 + likes * 5 + shares * 8 + favorites * 3
 * - Time bonus: Events happening soon get a boost
 * - Recency bonus: Recently created events get a small boost
 */

import { getDb } from "./db";
import { eventRankings, events, registrations, eventLikes, eventShares, favorites } from "../drizzle/schema";
import { eq, sql, and, gte, lte, desc, isNull, or } from "drizzle-orm";
import { logger } from "./logger";
import { cacheService } from "./cache";

// ============================================
// CONFIGURAÇÃO
// ============================================

const RANKING_CONFIG = {
  // Pesos para cada métrica
  weights: {
    registrations: 10,
    views: 0.1,
    likes: 5,
    shares: 8,
    favorites: 3,
  },
  
  // Bônus de tempo (eventos próximos são mais relevantes)
  timeBonus: {
    within24h: 50,    // Evento nas próximas 24h
    within3days: 30,  // Evento nos próximos 3 dias
    within7days: 15,  // Evento na próxima semana
    within30days: 5,  // Evento no próximo mês
  },
  
  // Cache TTL
  cacheTTL: 60, // 1 minuto (ranking é recalculado periodicamente)
  
  // Limite de eventos no ranking
  maxRankedEvents: 100,
};

// ============================================
// CÁLCULO DE RANKING
// ============================================

interface EventMetrics {
  eventId: number;
  registrationCount: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  favoriteCount: number;
  eventDate: Date | null;
  createdAt: Date;
}

/**
 * Calcula o score de um evento baseado nas métricas
 */
function calculateScore(metrics: EventMetrics): number {
  const { weights, timeBonus } = RANKING_CONFIG;
  
  // Score base
  let score = 
    metrics.registrationCount * weights.registrations +
    metrics.viewCount * weights.views +
    metrics.likeCount * weights.likes +
    metrics.shareCount * weights.shares +
    metrics.favoriteCount * weights.favorites;
  
  // Bônus de tempo
  if (metrics.eventDate) {
    const now = Date.now();
    const eventTime = new Date(metrics.eventDate).getTime();
    const hoursUntil = (eventTime - now) / (1000 * 60 * 60);
    
    if (hoursUntil > 0 && hoursUntil <= 24) {
      score += timeBonus.within24h;
    } else if (hoursUntil > 0 && hoursUntil <= 72) {
      score += timeBonus.within3days;
    } else if (hoursUntil > 0 && hoursUntil <= 168) {
      score += timeBonus.within7days;
    } else if (hoursUntil > 0 && hoursUntil <= 720) {
      score += timeBonus.within30days;
    }
  }
  
  // Bônus de recência (eventos criados recentemente)
  const daysSinceCreation = (Date.now() - new Date(metrics.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 7) {
    score += 10 - daysSinceCreation; // Até 10 pontos extras para eventos novos
  }
  
  return Math.round(score * 10000) / 10000; // 4 casas decimais
}

/**
 * Recalcula o ranking de todos os eventos ativos
 */
export async function recalculateRankings(): Promise<{ updated: number; duration: number }> {
  const startTime = Date.now();
  
  logger.info({}, `Starting ranking recalculation...`);
  
  const db = await getDb();
  if (!db) {
    logger.warn({}, `Database not available for ranking calculation`);
    return { updated: 0, duration: 0 };
  }
  
  try {
    // Buscar eventos ativos (publicados e não cancelados, com data futura ou recente)
    const now = new Date();
    const pastLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 dias
    
    const activeEvents = await db
      .select({
        id: events.id,
        eventDate: events.eventDate,
        createdAt: events.createdAt,
        viewCount: events.viewCount,
      })
      .from(events)
      .where(
        and(
          eq(events.status, 'published'),
          or(
            gte(events.eventDate, pastLimit),
            isNull(events.eventDate)
          )
        )
      );
    
    if (activeEvents.length === 0) {
      logger.info({}, `No active events to rank`);
      return { updated: 0, duration: Date.now() - startTime };
    }
    
    // Buscar métricas para cada evento
    const eventIds = activeEvents.map((e: any) => e.id);
    
    // Contagem de inscrições por evento
    const registrationCounts = await db
      .select({
        eventId: registrations.eventId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(registrations)
      .where(sql`${registrations.eventId} IN (${sql.join(eventIds.map((id: number) => sql`${id}`), sql`, `)})`)
      .groupBy(registrations.eventId);
    
    // Contagem de likes por evento
    const likeCounts = await db
      .select({
        eventId: eventLikes.eventId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(eventLikes)
      .where(sql`${eventLikes.eventId} IN (${sql.join(eventIds.map((id: number) => sql`${id}`), sql`, `)})`)
      .groupBy(eventLikes.eventId);
    
    // Contagem de shares por evento
    const shareCounts = await db
      .select({
        eventId: eventShares.eventId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(eventShares)
      .where(sql`${eventShares.eventId} IN (${sql.join(eventIds.map((id: number) => sql`${id}`), sql`, `)})`)
      .groupBy(eventShares.eventId);
    
    // Contagem de favoritos por evento
    const favoriteCounts = await db
      .select({
        eventId: favorites.eventId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(favorites)
      .where(sql`${favorites.eventId} IN (${sql.join(eventIds.map((id: number) => sql`${id}`), sql`, `)})`)
      .groupBy(favorites.eventId);
    
    // Mapear contagens
    const regMap = new Map<number, number>(registrationCounts.map((r: { eventId: number; count: number }) => [r.eventId, r.count]));
    const likeMap = new Map<number, number>(likeCounts.map((l: { eventId: number; count: number }) => [l.eventId, l.count]));
    const shareMap = new Map<number, number>(shareCounts.map((s: { eventId: number; count: number }) => [s.eventId, s.count]));
    const favMap = new Map<number, number>(favoriteCounts.map((f: { eventId: number; count: number }) => [f.eventId, f.count]));
    
    // Calcular scores
    interface RankedEvent {
      eventId: number;
      score: number;
      registrationCount: number;
      viewCount: number;
      likeCount: number;
      shareCount: number;
      favoriteCount: number;
      daysUntilEvent: number | null;
      hoursUntilEvent: number | null;
      rankPosition?: number;
    }
    
    const rankedEvents: RankedEvent[] = activeEvents.map((event: any) => {
      const metrics: EventMetrics = {
        eventId: event.id,
        registrationCount: regMap.get(event.id) || 0,
        viewCount: event.viewCount || 0,
        likeCount: likeMap.get(event.id) || 0,
        shareCount: shareMap.get(event.id) || 0,
        favoriteCount: favMap.get(event.id) || 0,
        eventDate: event.eventDate,
        createdAt: event.createdAt,
      };
      
      const score = calculateScore(metrics);
      const eventDate = event.eventDate ? new Date(event.eventDate) : null;
      const now = Date.now();
      
      return {
        eventId: event.id,
        score,
        registrationCount: metrics.registrationCount,
        viewCount: metrics.viewCount,
        likeCount: metrics.likeCount,
        shareCount: metrics.shareCount,
        favoriteCount: metrics.favoriteCount,
        daysUntilEvent: eventDate ? Math.floor((eventDate.getTime() - now) / (1000 * 60 * 60 * 24)) : null,
        hoursUntilEvent: eventDate ? Math.floor((eventDate.getTime() - now) / (1000 * 60 * 60)) : null,
      };
    });
    
    // Ordenar por score e atribuir posições
    rankedEvents.sort((a: RankedEvent, b: RankedEvent) => b.score - a.score);
    rankedEvents.forEach((event: RankedEvent, index: number) => {
      event.rankPosition = index + 1;
    });
    
    // Limitar ao máximo configurado
    const topEvents = rankedEvents.slice(0, RANKING_CONFIG.maxRankedEvents);
    
    // Atualizar tabela de rankings (upsert)
    for (const event of topEvents) {
      await db
        .insert(eventRankings)
        .values({
          eventId: event.eventId,
          score: String(event.score),
          registrationCount: event.registrationCount,
          viewCount: event.viewCount,
          likeCount: event.likeCount,
          shareCount: event.shareCount,
          favoriteCount: event.favoriteCount,
          daysUntilEvent: event.daysUntilEvent,
          hoursUntilEvent: event.hoursUntilEvent,
          rankPosition: (event as any).rankPosition,
          calculatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            score: String(event.score),
            registrationCount: event.registrationCount,
            viewCount: event.viewCount,
            likeCount: event.likeCount,
            shareCount: event.shareCount,
            favoriteCount: event.favoriteCount,
            daysUntilEvent: event.daysUntilEvent,
            hoursUntilEvent: event.hoursUntilEvent,
            rankPosition: (event as any).rankPosition,
            calculatedAt: new Date(),
          },
        });
    }
    
    // Invalidar cache
    await cacheService.invalidatePattern('highlights');
    await cacheService.invalidatePattern('ranking');
    
    const duration = Date.now() - startTime;
    
    logger.info({ 
      updated: topEvents.length, 
      duration,
      topScore: topEvents[0]?.score,
    }, `Ranking recalculation completed`);
    
    return { updated: topEvents.length, duration };
  } catch (error) {
    logger.error({ error }, `Failed to recalculate rankings`);
    throw error;
  }
}

/**
 * Obtém eventos em alta usando ranking pré-calculado
 */
export async function getHighlightedEvents(limit: number = 10): Promise<any[]> {
  const cacheKey = `ranking:highlights:${limit}`;
  
  // Tentar cache primeiro
  const cached = await cacheService.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const db = await getDb();
  if (!db) {
    return [];
  }
  
  // Buscar do banco
  const rankings: Array<{
    eventId: number;
    score: string;
    rankPosition: number | null;
    registrationCount: number | null;
    likeCount: number | null;
    shareCount: number | null;
    favoriteCount: number | null;
  }> = await db
    .select({
      eventId: eventRankings.eventId,
      score: eventRankings.score,
      rankPosition: eventRankings.rankPosition,
      registrationCount: eventRankings.registrationCount,
      likeCount: eventRankings.likeCount,
      shareCount: eventRankings.shareCount,
      favoriteCount: eventRankings.favoriteCount,
    })
    .from(eventRankings)
    .orderBy(desc(eventRankings.score))
    .limit(limit);
  
  if (rankings.length === 0) {
    // Fallback: recalcular se não houver rankings
    await recalculateRankings();
    return getHighlightedEvents(limit);
  }
  
  // Buscar detalhes dos eventos
  const eventIds = rankings.map((r: { eventId: number }) => r.eventId);
  
  const eventDetails = await db
    .select()
    .from(events)
    .where(sql`${events.id} IN (${sql.join(eventIds.map((id: number) => sql`${id}`), sql`, `)})`);
  
  // Combinar rankings com detalhes
  const eventMap = new Map(eventDetails.map((e: any) => [e.id, e]));
  
  const result = rankings
    .map((r: any) => {
      const event = eventMap.get(r.eventId);
      if (!event) return null;
      
      return {
        ...event,
        ranking: {
          score: r.score,
          position: r.rankPosition,
          registrationCount: r.registrationCount,
          likeCount: r.likeCount,
          shareCount: r.shareCount,
          favoriteCount: r.favoriteCount,
        },
      };
    })
    .filter(Boolean);
  
  // Cachear resultado
  await cacheService.set(cacheKey, result, RANKING_CONFIG.cacheTTL);
  
  return result;
}

/**
 * Inicia job de recálculo periódico
 */
export function startRankingJob(intervalMs: number = 15 * 60 * 1000): NodeJS.Timeout {
  logger.info({ intervalMs }, `Starting ranking recalculation job`);
  
  // Executar imediatamente na inicialização
  recalculateRankings().catch(err => {
    logger.error({ error: err }, `Initial ranking calculation failed`);
  });
  
  // Agendar recálculos periódicos
  return setInterval(() => {
    recalculateRankings().catch(err => {
      logger.error({ error: err }, `Scheduled ranking calculation failed`);
    });
  }, intervalMs);
}

export default {
  recalculateRankings,
  getHighlightedEvents,
  startRankingJob,
};

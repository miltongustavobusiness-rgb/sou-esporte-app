import { eq, and, gte, lte, lt, gt, like, desc, asc, sql, or, inArray, isNull, isNotNull, ne, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import crypto from 'crypto';
import { 
  InsertUser, users, 
  events, InsertEvent, Event,
  eventCategories, InsertEventCategory,
  eventKits, InsertEventKit,
  eventPhotos, InsertEventPhoto,
  registrations, InsertRegistration,
  results, InsertResult,
  teams, InsertTeam, Team,
  teamMembers, InsertTeamMember, TeamMember,
  teamInvitations, InsertTeamInvitation, TeamInvitation,
  notifications, InsertNotification, Notification,
  favorites, InsertFavorite, Favorite,
  checkins, InsertCheckin, Checkin,
  passwordResetTokens, InsertPasswordResetToken, PasswordResetToken,
  vouchers, InsertVoucher, Voucher,
  voucherUsages, InsertVoucherUsage, VoucherUsage,
  pushTokens, InsertPushToken, PushToken,
  eventLikes, InsertEventLike, EventLike,
  eventShares, InsertEventShare, EventShare,
  groups, InsertGroup, Group,
  groupMembers, InsertGroupMember, GroupMember,
  posts, InsertPost, Post,
  postLikes, InsertPostLike, PostLike,
  comments, InsertComment, Comment,
  commentLikes, InsertCommentLike, CommentLike,
  reports, InsertReport, Report,
  mediaUploads, InsertMediaUpload, MediaUpload,
  trainings, InsertTraining, Training,
  trainingRsvps, InsertTrainingRsvp, TrainingRsvp,
  userFollows, InsertUserFollow, UserFollow,
  chatThreads, InsertChatThread, ChatThread,
  chatMessages, InsertChatMessage, ChatMessage,
  savedPosts, InsertSavedPost, SavedPost,
  // V12.10 - Groups Expanded
  functionalTrainings, InsertFunctionalTraining, FunctionalTraining,
  functionalTrainingParticipants, InsertFunctionalTrainingParticipant, FunctionalTrainingParticipant,
  hikes, InsertHike, Hike,
  hikeParticipants, InsertHikeParticipant, HikeParticipant,
  yogaSessions, InsertYogaSession, YogaSession,
  yogaSessionParticipants, InsertYogaSessionParticipant, YogaSessionParticipant,
  fightTrainings, InsertFightTraining, FightTraining,
  fightTrainingParticipants, InsertFightTrainingParticipant, FightTrainingParticipant,
  groupInvites, InsertGroupInvite, GroupInvite,
  groupMessages, InsertGroupMessage, GroupMessage,
  groupRankings, InsertGroupRanking, GroupRanking,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.cpf, cpf)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Hash password using SHA-256 with salt
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 10000, 64, 'sha512').toString('hex');
  return { hash: `${useSalt}:${hash}`, salt: useSalt };
}

// Verify password against stored hash
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const { hash: newHash } = hashPassword(password, salt);
  return storedHash === newHash;
}

export async function getUserByEmailAndPassword(email: string, password: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(
    eq(users.email, email)
  ).limit(1);
  
  if (result.length === 0) return undefined;
  
  const user = result[0];
  
  // Verify password hash
  if (!user.passwordHash) return undefined;
  
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) return undefined;
  
  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  cpf: string | null;
  phone: string | null;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | null;
  photoUrl: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // For mobile registration, use email as part of openId
  const openId = `mobile-${nanoid(16)}`;
  
  // Hash the password
  const { hash: passwordHash } = hashPassword(data.password);
  
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash,
    loginMethod: 'email',
    cpf: data.cpf,
    phone: data.phone,
    birthDate: data.birthDate,
    gender: data.gender,
    photoUrl: data.photoUrl,
    role: 'user',
    lastSignedIn: new Date(),
  });
  
  return Number(result[0].insertId);
}

export async function createUserWithEmail(data: {
  email: string;
  name: string | null;
  loginMethod: string;
}): Promise<{ id: number; email: string; name: string | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // For OTP registration, use email as part of openId
  const openId = `otp-${nanoid(16)}`;
  
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: data.loginMethod,
    role: 'user',
    lastSignedIn: new Date(),
  });
  
  const userId = Number(result[0].insertId);
  
  return {
    id: userId,
    email: data.email,
    name: data.name,
  };
}

export async function getLatestPasswordResetToken(email: string): Promise<{ code: string; token: string } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const tokens = await db.select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);
  
  if (tokens.length === 0) return null;
  
  return {
    code: tokens[0].code,
    token: tokens[0].token,
  };
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserStats(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Calculate stats from results
  const userResults = await db
    .select({
      chipTime: results.chipTime,
      distance: eventCategories.distance,
    })
    .from(results)
    .innerJoin(eventCategories, eq(results.categoryId, eventCategories.id))
    .where(and(
      eq(results.userId, userId),
      eq(results.status, 'official')
    ));
  
  const totalRaces = userResults.length;
  const totalDistance = userResults.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
  
  // Find best times by distance
  const bestTimes: Record<string, number | null> = { '5': null, '10': null, '21': null, '42': null };
  
  for (const r of userResults) {
    if (!r.chipTime || !r.distance) continue;
    const dist = Math.round(Number(r.distance));
    const key = dist.toString();
    if (bestTimes[key] === null || r.chipTime < bestTimes[key]!) {
      bestTimes[key] = r.chipTime;
    }
  }
  
  await db.update(users).set({
    totalRaces,
    totalDistance: totalDistance.toString(),
    bestTime5k: bestTimes['5'],
    bestTime10k: bestTimes['10'],
    bestTime21k: bestTimes['21'],
    bestTime42k: bestTimes['42'],
  }).where(eq(users.id, userId));
}

// ==================== EVENT QUERIES ====================

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Calculate eventStartAt from eventDate + eventTime
  let eventStartAt: Date | null = null;
  if (data.eventDate) {
    const eventDate = new Date(data.eventDate);
    if (data.eventTime) {
      // Parse HH:mm format and combine with date
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      eventStartAt = new Date(eventDate);
      eventStartAt.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 07:00 if no time specified
      eventStartAt = new Date(eventDate);
      eventStartAt.setHours(7, 0, 0, 0);
    }
  }
  
  const result = await db.insert(events).values({
    ...data,
    eventStartAt,
    eventTimezone: data.eventTimezone || 'America/Sao_Paulo',
  });
  return result[0].insertId;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Se evento está mudando para gratuito, forçar todas categorias como gratuitas
  if (data.isPaidEvent === false) {
    await db.update(eventCategories)
      .set({ isPaid: false, price: '0' })
      .where(eq(eventCategories.eventId, id));
  }
  
  // Recalculate eventStartAt if eventDate or eventTime changed
  let eventStartAt: Date | null | undefined = undefined;
  if (data.eventDate || data.eventTime) {
    // Get current event to merge with new data
    const currentEvent = await getEventById(id);
    if (currentEvent) {
      const eventDate = data.eventDate ? new Date(data.eventDate) : new Date(currentEvent.eventDate);
      const eventTime = data.eventTime || currentEvent.eventTime;
      
      if (eventTime) {
        const [hours, minutes] = eventTime.split(':').map(Number);
        eventStartAt = new Date(eventDate);
        eventStartAt.setHours(hours, minutes, 0, 0);
      } else {
        eventStartAt = new Date(eventDate);
        eventStartAt.setHours(7, 0, 0, 0);
      }
    }
  }
  
  const updateData = eventStartAt !== undefined 
    ? { ...data, eventStartAt }
    : data;
  
  await db.update(events).set(updateData).where(eq(events.id, id));
}

export async function cancelEvent(id: number, data: {
  cancelReason: string;
  cancelledAt: Date;
  cancelledByOrganizerId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(events).set({
    status: 'cancelled',
    cancelReason: data.cancelReason,
    cancelledAt: data.cancelledAt,
    cancelledByOrganizerId: data.cancelledByOrganizerId,
  }).where(eq(events.id, id));
}

export async function updateRegistrationRefund(registrationId: number, data: {
  refundStatus: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  refundReason?: string;
  refundTransactionId?: string;
  refundedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(registrations).set(data).where(eq(registrations.id, registrationId));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related records first (cascade)
  await db.delete(eventCategories).where(eq(eventCategories.eventId, id));
  await db.delete(eventKits).where(eq(eventKits.eventId, id));
  await db.delete(eventPhotos).where(eq(eventPhotos.eventId, id));
  await db.delete(registrations).where(eq(registrations.eventId, id));
  await db.delete(favorites).where(eq(favorites.eventId, id));
  
  // Delete the event
  await db.delete(events).where(eq(events.id, id));
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Conta inscrições ativas (confirmed ou paid) para um evento
 */
export async function getEventSubscribersCount(eventId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(registrations)
    .where(and(
      eq(registrations.eventId, eventId),
      or(
        eq(registrations.status, 'confirmed'),
        eq(registrations.paymentStatus, 'paid')
      )
    ));
  
  return Number(result[0]?.count || 0);
}

/**
 * Atualiza o contador de inscritos do evento (para manter sincronizado)
 */
export async function updateEventSubscribersCount(eventId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const count = await getEventSubscribersCount(eventId);
  await db.update(events)
    .set({ subscribersCount: count })
    .where(eq(events.id, eventId));
}

export async function getEventBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

interface EventFilters {
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  distance?: number;
  status?: 'draft' | 'published' | 'cancelled' | 'finished';
  featured?: boolean;
  trending?: boolean; // alias para featured
  search?: string;
  limit?: number;
  offset?: number;
  type?: string; // Modalidade Esportiva (corrida, ciclismo, triathlon, etc) - NÃO confundir com categoria de inscrição
  category?: string; // alias para type (Modalidade Esportiva)
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'date' | 'name' | 'trending' | 'price';
  sortOrder?: 'asc' | 'desc';
  organizerId?: number;
  tags?: string[];
  timeFilter?: 'upcoming' | 'past' | 'all'; // filtro de tempo: próximos, passados, todos
  // Filtros de preço/gratuidade
  isPaidEvent?: boolean; // true = apenas pagos, false = apenas gratuitos
  hasFreeCategories?: boolean; // true = eventos com categorias gratuitas
}

export async function listEvents(filters: EventFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  // Status filter
  if (filters.status) {
    conditions.push(eq(events.status, filters.status));
  }
  
  // Location filters
  if (filters.city) {
    conditions.push(like(events.city, `%${filters.city}%`));
  }
  if (filters.state) {
    conditions.push(eq(events.state, filters.state));
  }
  
  // Date filters
  if (filters.dateFrom) {
    conditions.push(gte(events.eventDate, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(events.eventDate, filters.dateTo));
  }
  
  // Time filter (upcoming/past/all)
  if (filters.timeFilter) {
    const now = new Date();
    if (filters.timeFilter === 'upcoming') {
      conditions.push(gte(events.eventDate, now));
    } else if (filters.timeFilter === 'past') {
      conditions.push(lt(events.eventDate, now));
    }
    // 'all' não adiciona filtro de data
  }
  
  // Featured/Trending filter (aliases)
  if (filters.featured !== undefined) {
    conditions.push(eq(events.featured, filters.featured));
  } else if (filters.trending !== undefined) {
    conditions.push(eq(events.featured, filters.trending));
  }
  
  // Search filter (full-text search simulation)
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    conditions.push(or(
      like(events.name, `%${searchTerm}%`),
      like(events.city, `%${searchTerm}%`),
      like(events.description, `%${searchTerm}%`),
      like(events.organizerName, `%${searchTerm}%`)
    ));
  }
  
  // Modalidade Esportiva filter (type/category são aliases)
  // NOTA: "category" aqui refere-se à MODALIDADE ESPORTIVA, não à categoria de inscrição (5K, 10K, etc.)
  const eventType = filters.type || filters.category;
  if (eventType) {
    conditions.push(eq(events.eventType, eventType as any));
  }
  
  // Organizer filter
  if (filters.organizerId) {
    conditions.push(eq(events.organizerId, filters.organizerId));
  }
  
  // Filtro de evento gratuito/pago
  if (filters.isPaidEvent !== undefined) {
    conditions.push(eq(events.isPaidEvent, filters.isPaidEvent));
  }
  
  let query = db.select().from(events);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  // Sorting
  const isDescOrder = filters.sortOrder === 'desc';
  switch (filters.sortBy) {
    case 'name':
      query = query.orderBy(isDescOrder ? desc(events.name) : asc(events.name)) as typeof query;
      break;
    case 'trending':
      query = query.orderBy(desc(events.featured), asc(events.eventDate)) as typeof query;
      break;
    case 'date':
    default:
      // Para eventos passados, ordenar por data decrescente (mais recente primeiro)
      // Para eventos futuros, ordenar por data crescente (próximo primeiro)
      if (filters.timeFilter === 'past') {
        query = query.orderBy(desc(events.eventDate)) as typeof query;
      } else {
        query = query.orderBy(isDescOrder ? desc(events.eventDate) : asc(events.eventDate)) as typeof query;
      }
      break;
  }
  
  // Pagination
  if (filters.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters.offset) {
    query = query.offset(filters.offset) as typeof query;
  }
  
  return await query;
}

// Ranking weights for highlight events (configurable)
const HIGHLIGHT_WEIGHTS = {
  searchCount: 2,      // Weight for search count
  viewCount: 1,        // Weight for view count
  registrations: 5,    // Weight for number of registrations
  occupancyRate: 10,   // Weight for occupancy rate (registrations/maxParticipants)
  velocityBonus: 3,    // Bonus for recent registrations (last 7 days)
  proximityPenalty: 0.5 // Penalty per day until event (closer = better)
};

export async function getHighlightEvents(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  
  // Get all active, published, upcoming events
  // Check if registration is open based on registrationEndDate (if set) or eventDate
  const activeEvents = await db.select().from(events)
    .where(and(
      eq(events.status, 'published'),
      gte(events.eventDate, now)
    ));
  
  if (activeEvents.length === 0) return [];
  
  // Get registration counts for each event
  const eventIds = activeEvents.map(e => e.id);
  const regCounts = await db.select({
    eventId: registrations.eventId,
    count: sql<number>`COUNT(*)`
  }).from(registrations)
    .where(inArray(registrations.eventId, eventIds))
    .groupBy(registrations.eventId);
  
  const regCountMap = new Map(regCounts.map(r => [r.eventId, r.count]));
  
  // Get recent registrations (last 7 days) for velocity calculation
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentRegs = await db.select({
    eventId: registrations.eventId,
    count: sql<number>`COUNT(*)`
  }).from(registrations)
    .where(and(
      inArray(registrations.eventId, eventIds),
      gte(registrations.createdAt, sevenDaysAgo)
    ))
    .groupBy(registrations.eventId);
  
  const recentRegMap = new Map(recentRegs.map(r => [r.eventId, r.count]));
  
  // Calculate score for each event
  const scoredEvents = activeEvents.map(event => {
    const regCount = regCountMap.get(event.id) || 0;
    const recentRegCount = recentRegMap.get(event.id) || 0;
    // maxParticipants is not in events table, use a default value for now
    // In the future, this could be calculated from event categories
    const maxParticipants = 100; // Default capacity
    const occupancyRate = regCount / maxParticipants;
    
    // Days until event (closer = better)
    const daysUntil = Math.max(0, Math.floor((new Date(event.eventDate!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    
    // Calculate score
    const score = 
      (event.searchCount * HIGHLIGHT_WEIGHTS.searchCount) +
      (event.viewCount * HIGHLIGHT_WEIGHTS.viewCount) +
      (regCount * HIGHLIGHT_WEIGHTS.registrations) +
      (occupancyRate * 100 * HIGHLIGHT_WEIGHTS.occupancyRate) +
      (recentRegCount * HIGHLIGHT_WEIGHTS.velocityBonus) -
      (daysUntil * HIGHLIGHT_WEIGHTS.proximityPenalty);
    
    return {
      ...event,
      score,
      registrationCount: regCount,
      occupancyRate: Math.round(occupancyRate * 100)
    };
  });
  
  // Sort by score descending and limit to top N
  scoredEvents.sort((a, b) => b.score - a.score);
  
  return scoredEvents.slice(0, limit);
}

export async function incrementEventSearchCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(events)
    .set({ searchCount: sql`${events.searchCount} + 1` })
    .where(eq(events.id, eventId));
}

export async function incrementEventViewCount(eventId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(events)
    .set({ viewCount: sql`${events.viewCount} + 1` })
    .where(eq(events.id, eventId));
}

export async function getEventsByOrganizer(organizerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.eventDate));
}

// ==================== EVENT CATEGORIES QUERIES ====================

export async function createEventCategory(data: InsertEventCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validação server-side: evento gratuito não permite categoria paga
  const event = await getEventById(data.eventId);
  if (event && event.isPaidEvent === false && data.isPaid === true) {
    throw new Error("Evento gratuito não pode ter categoria paga. Altere o evento para cobrado ou defina a categoria como gratuita.");
  }
  
  // Se evento for gratuito, forçar categoria como gratuita
  if (event && event.isPaidEvent === false) {
    data.isPaid = false;
    data.price = '0';
  }
  
  const result = await db.insert(eventCategories).values(data);
  return result[0].insertId;
}

export async function getEventCategories(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(eventCategories)
    .where(eq(eventCategories.eventId, eventId))
    .orderBy(asc(eventCategories.distance));
}

/**
 * Calcula campos derivados de preço para um evento baseado em suas categorias
 * - hasFreeCategories: true se existe pelo menos uma categoria gratuita (isPaid = false)
 * - hasPaidCategories: true se existe pelo menos uma categoria paga (isPaid = true)
 */
export async function getEventPricingInfo(eventId: number): Promise<{
  hasFreeCategories: boolean;
  hasPaidCategories: boolean;
}> {
  const categories = await getEventCategories(eventId);
  
  const hasFreeCategories = categories.some(cat => cat.isPaid === false);
  const hasPaidCategories = categories.some(cat => cat.isPaid === true);
  
  return { hasFreeCategories, hasPaidCategories };
}

/**
 * Retorna evento com campos derivados de preço
 */
export async function getEventWithPricingInfo(eventId: number) {
  const event = await getEventById(eventId);
  if (!event) return undefined;
  
  const pricingInfo = await getEventPricingInfo(eventId);
  
  return {
    ...event,
    ...pricingInfo,
  };
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(eventCategories)
    .where(eq(eventCategories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCategoryParticipants(categoryId: number, increment: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(eventCategories)
    .set({ currentParticipants: sql`${eventCategories.currentParticipants} + ${increment}` })
    .where(eq(eventCategories.id, categoryId));
}

// ==================== EVENT KITS QUERIES ====================

export async function createEventKit(data: InsertEventKit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(eventKits).values(data);
  return result[0].insertId;
}

export async function getEventKits(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(eventKits)
    .where(and(eq(eventKits.eventId, eventId), eq(eventKits.available, true)));
}

export async function getKitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(eventKits)
    .where(eq(eventKits.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== EVENT PHOTOS QUERIES ====================

export async function createEventPhoto(data: InsertEventPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(eventPhotos).values(data);
  return result[0].insertId;
}

export async function getEventPhotos(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(eventPhotos)
    .where(eq(eventPhotos.eventId, eventId))
    .orderBy(asc(eventPhotos.sortOrder));
}

export async function deleteEventPhoto(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(eventPhotos).where(eq(eventPhotos.id, id));
}

// ==================== REGISTRATION QUERIES ====================

export async function createRegistration(data: Omit<InsertRegistration, 'checkoutToken'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const checkoutToken = nanoid(32);
  
  const result = await db.insert(registrations).values({
    ...data,
    checkoutToken,
  });
  
  // Update category participants count
  await updateCategoryParticipants(data.categoryId, 1);
  
  return { id: result[0].insertId, checkoutToken };
}

export async function getRegistrationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(registrations)
    .where(eq(registrations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRegistrationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(registrations)
    .where(eq(registrations.checkoutToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserRegistrations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    registration: registrations,
    event: events,
    category: eventCategories,
    kit: eventKits,
  })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(eventCategories, eq(registrations.categoryId, eventCategories.id))
    .leftJoin(eventKits, eq(registrations.kitId, eventKits.id))
    .where(eq(registrations.userId, userId))
    .orderBy(desc(events.eventDate));
}

export async function getEventRegistrations(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    registration: registrations,
    user: users,
    category: eventCategories,
    kit: eventKits,
  })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(eventCategories, eq(registrations.categoryId, eventCategories.id))
    .leftJoin(eventKits, eq(registrations.kitId, eventKits.id))
    .where(eq(registrations.eventId, eventId))
    .orderBy(desc(registrations.createdAt));
}

export async function updateRegistrationPayment(
  token: string, 
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded',
  transactionId?: string,
  paymentMethod?: string
) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Partial<InsertRegistration> = {
    paymentStatus,
    transactionId,
    paymentMethod,
  };
  
  if (paymentStatus === 'paid') {
    updateData.paymentDate = new Date();
    updateData.status = 'confirmed';
  } else if (paymentStatus === 'cancelled' || paymentStatus === 'refunded') {
    updateData.status = 'cancelled';
  }
  
  await db.update(registrations)
    .set(updateData)
    .where(eq(registrations.checkoutToken, token));
}

export async function checkExistingRegistration(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: registrations.id })
    .from(registrations)
    .where(and(
      eq(registrations.userId, userId),
      eq(registrations.eventId, eventId),
      or(eq(registrations.status, 'pending'), eq(registrations.status, 'confirmed'))
    ))
    .limit(1);
  
  return result.length > 0;
}

// ==================== RESULTS QUERIES ====================

export async function createResult(data: InsertResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(results).values(data);
  
  // Update user stats
  await updateUserStats(data.userId);
  
  return result[0].insertId;
}

export async function updateResult(id: number, data: Partial<InsertResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(results).set(data).where(eq(results.id, id));
}

export async function getResultById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(results)
    .where(eq(results.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getResultByRegistration(registrationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(results)
    .where(eq(results.registrationId, registrationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserResults(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    result: results,
    event: events,
    category: eventCategories,
  })
    .from(results)
    .innerJoin(events, eq(results.eventId, events.id))
    .innerJoin(eventCategories, eq(results.categoryId, eventCategories.id))
    .where(eq(results.userId, userId))
    .orderBy(desc(events.eventDate));
}

export async function getEventResults(eventId: number, categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(results.eventId, eventId)];
  if (categoryId) {
    conditions.push(eq(results.categoryId, categoryId));
  }
  
  return await db.select({
    result: results,
    user: users,
    category: eventCategories,
  })
    .from(results)
    .innerJoin(users, eq(results.userId, users.id))
    .innerJoin(eventCategories, eq(results.categoryId, eventCategories.id))
    .where(and(...conditions))
    .orderBy(asc(results.overallRank));
}

export async function bulkCreateResults(resultsData: InsertResult[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (resultsData.length === 0) return;
  
  await db.insert(results).values(resultsData);
  
  // Update stats for all affected users
  const userIds = Array.from(new Set(resultsData.map(r => r.userId)));
  for (const userId of userIds) {
    await updateUserStats(userId);
  }
}


// ==================== TEAM QUERIES ====================

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teams).values(data);
  return result[0].insertId;
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teams).set(data).where(eq(teams.id, id));
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTeamBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTeams(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    team: teams,
    membership: teamMembers,
  })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, 'active')
    ));
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    member: teamMembers,
    user: users,
  })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(teamMembers.role), asc(users.name));
}

export async function getTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addTeamMember(data: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teamMembers).values(data);
  return result[0].insertId;
}

export async function updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
}

export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(teamMembers).where(and(
    eq(teamMembers.teamId, teamId),
    eq(teamMembers.userId, userId)
  ));
}

// ==================== TEAM INVITATION QUERIES ====================

export async function createTeamInvitation(data: InsertTeamInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teamInvitations).values(data);
  return result[0].insertId;
}

export async function getTeamInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(teamInvitations)
    .where(eq(teamInvitations.token, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingInvitationsForUser(userId: number, email?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(teamInvitations.status, 'pending')];
  
  if (email) {
    conditions.push(or(
      eq(teamInvitations.userId, userId),
      eq(teamInvitations.email, email)
    )!);
  } else {
    conditions.push(eq(teamInvitations.userId, userId));
  }
  
  return await db.select({
    invitation: teamInvitations,
    team: teams,
  })
    .from(teamInvitations)
    .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
    .where(and(...conditions));
}

export async function updateTeamInvitation(id: number, data: Partial<InsertTeamInvitation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teamInvitations).set(data).where(eq(teamInvitations.id, id));
}

// ==================== TEAM REGISTRATION QUERIES ====================

export async function createTeamRegistration(
  teamId: number,
  registeredBy: number,
  registrations_data: Array<{
    userId: number;
    eventId: number;
    categoryId: number;
    kitId?: number;
    kitSize?: string;
    categoryPrice: string;
    kitPrice: string;
    totalPrice: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results: Array<{ id: number; checkoutToken: string; userId: number }> = [];
  
  for (const reg of registrations_data) {
    const checkoutToken = nanoid(32);
    const result = await db.insert(registrations).values({
      ...reg,
      teamId,
      registeredBy,
      checkoutToken,
      paymentStatus: 'pending',
      status: 'pending',
    });
    
    results.push({
      id: result[0].insertId,
      checkoutToken,
      userId: reg.userId,
    });
  }
  
  return results;
}

export async function getTeamRegistrations(teamId: number, eventId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(registrations.teamId, teamId)];
  if (eventId) {
    conditions.push(eq(registrations.eventId, eventId));
  }
  
  return await db.select({
    registration: registrations,
    user: users,
    event: events,
    category: eventCategories,
  })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(eventCategories, eq(registrations.categoryId, eventCategories.id))
    .where(and(...conditions))
    .orderBy(desc(registrations.createdAt));
}

export async function searchTeams(query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(teams)
    .where(and(
      eq(teams.isPublic, true),
      or(
        like(teams.name, `%${query}%`),
        like(teams.city, `%${query}%`)
      )
    ))
    .limit(limit);
}

export async function isTeamAdmin(teamId: number, userId: number): Promise<boolean> {
  const member = await getTeamMember(teamId, userId);
  return member !== undefined && (member.role === 'owner' || member.role === 'admin');
}


// ==================== NOTIFICATIONS QUERIES ====================

export async function getUserNotifications(userId: number, unreadOnly?: boolean, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }
  
  let query = db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  
  if (limit) {
    query = query.limit(limit) as typeof query;
  }
  
  return await query;
}

export async function markNotificationAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return { count: 0 };
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  
  return { count: result[0]?.count || 0 };
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

// ==================== FAVORITES QUERIES ====================

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: favorites.id,
    eventId: favorites.eventId,
    createdAt: favorites.createdAt,
    event: events,
  })
    .from(favorites)
    .innerJoin(events, eq(favorites.eventId, events.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

export async function addFavorite(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already favorited
  const existing = await db.select().from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)))
    .limit(1);
  
  if (existing.length > 0) return existing[0].id;
  
  const result = await db.insert(favorites).values({ userId, eventId });
  return result[0].insertId;
}

export async function removeFavorite(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)));
}

export async function isFavorite(userId: number, eventId: number) {
  const db = await getDb();
  if (!db) return { isFavorite: false };
  
  const result = await db.select().from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)))
    .limit(1);
  
  return { isFavorite: result.length > 0 };
}

// ==================== CHECK-IN QUERIES ====================

export async function getCheckinByRegistration(registrationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(checkins)
    .where(eq(checkins.registrationId, registrationId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createCheckin(data: InsertCheckin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(checkins).values(data);
  return result[0].insertId;
}

export async function getCheckinStats(eventId: number) {
  const db = await getDb();
  if (!db) return { total: 0, checkedIn: 0, kitsDelivered: 0 };
  
  // Get total registrations for event
  const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(registrations)
    .where(and(eq(registrations.eventId, eventId), eq(registrations.paymentStatus, 'paid')));
  
  const total = totalResult[0]?.count || 0;
  
  // Get checked in count
  const checkedInResult = await db.select({ count: sql<number>`count(*)` })
    .from(checkins)
    .where(eq(checkins.eventId, eventId));
  
  const checkedIn = checkedInResult[0]?.count || 0;
  
  // Get kits delivered count
  const kitsResult = await db.select({ count: sql<number>`count(*)` })
    .from(checkins)
    .where(and(eq(checkins.eventId, eventId), eq(checkins.kitDelivered, true)));
  
  const kitsDelivered = kitsResult[0]?.count || 0;
  
  return { total, checkedIn, kitsDelivered };
}

export async function getRegistrationByRaceNumber(eventId: number, raceNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(registrations)
    .where(and(
      eq(registrations.eventId, eventId),
      eq(registrations.raceNumber, raceNumber)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}


// Get organizer dashboard stats
export async function getOrganizerStats(organizerId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalEvents: 0,
      activeEvents: 0,
      totalRegistrations: 0,
      paidRegistrations: 0,
      pendingRegistrations: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
    };
  }
  
  // Get events by this organizer
  const organizerEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.organizerId, organizerId));
  
  const eventIds = organizerEvents.map(e => e.id);
  
  if (eventIds.length === 0) {
    return {
      totalEvents: 0,
      activeEvents: 0,
      totalRegistrations: 0,
      paidRegistrations: 0,
      pendingRegistrations: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
    };
  }
  
  // Get all registrations for these events
  const allRegistrations = await db
    .select({
      id: registrations.id,
      paymentStatus: registrations.paymentStatus,
      totalPrice: registrations.totalPrice,
    })
    .from(registrations)
    .where(inArray(registrations.eventId, eventIds));
  
  // Calculate stats
  type RegType = { id: number; paymentStatus: string; totalPrice: string };
  const paidRegs = allRegistrations.filter((r: RegType) => r.paymentStatus === 'paid');
  const pendingRegs = allRegistrations.filter((r: RegType) => r.paymentStatus === 'pending');
  
  const totalRevenue = paidRegs.reduce((sum: number, r: RegType) => sum + parseFloat(r.totalPrice || '0'), 0);
  const pendingRevenue = pendingRegs.reduce((sum: number, r: RegType) => sum + parseFloat(r.totalPrice || '0'), 0);
  
  // Count active events (published and future date)
  const now = new Date();
  const activeEventsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(and(
      eq(events.organizerId, organizerId),
      eq(events.status, 'published'),
      gte(events.eventDate, now)
    ));
  
  return {
    totalEvents: eventIds.length,
    activeEvents: activeEventsResult[0]?.count || 0,
    totalRegistrations: allRegistrations.length,
    paidRegistrations: paidRegs.length,
    pendingRegistrations: pendingRegs.length,
    totalRevenue,
    pendingRevenue,
  };
}


// ==================== REGISTRATION STATUS UPDATES ====================

export async function updateRegistrationCheckIn(registrationId: number, checkedIn: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update the registration status to confirmed if checking in
  if (checkedIn) {
    await db.update(registrations)
      .set({ status: 'confirmed' })
      .where(eq(registrations.id, registrationId));
  }
  
  // Also create a check-in record - get registration to get eventId and userId
  const reg = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (reg.length > 0) {
    await db.insert(checkins).values({
      registrationId,
      eventId: reg[0].eventId,
      userId: reg[0].userId,
      checkedInBy: reg[0].userId, // Self check-in
      method: 'manual',
    }).onDuplicateKeyUpdate({
      set: { checkedInBy: reg[0].userId }
    });
  }
}

export async function updateRegistrationPaymentStatus(
  registrationId: number, 
  status: 'pending' | 'paid' | 'cancelled' | 'refunded'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: Record<string, any> = { paymentStatus: status };
  
  if (status === 'paid') {
    updateData.paymentDate = new Date();
    updateData.status = 'confirmed';
  }
  
  await db.update(registrations)
    .set(updateData)
    .where(eq(registrations.id, registrationId));
}

export async function updateRegistrationStatus(
  registrationId: number, 
  status: 'pending' | 'confirmed' | 'cancelled' | 'noshow'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(registrations)
    .set({ status })
    .where(eq(registrations.id, registrationId));
}

// ==================== EVENT RESULTS ====================

export async function createEventResult(data: {
  eventId: number;
  athleteName: string;
  bibNumber?: string;
  categoryName?: string;
  chipTime: string;
  gunTime?: string;
  pace?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create a result record in the results table
  // First, find or create a registration for this athlete
  const result = await db.insert(results).values({
    registrationId: 0, // No registration linked
    userId: 0, // No user linked
    eventId: data.eventId,
    categoryId: 0, // No category linked
    chipTime: parseTimeToSeconds(data.chipTime),
    gunTime: data.gunTime ? parseTimeToSeconds(data.gunTime) : null,
    avgPace: data.pace ? parsePaceToSeconds(data.pace) : null,
    overallRank: null,
    categoryRank: null,
    genderRank: null,
    splits: null,
    status: 'official',
    certificateUrl: null,
  });
  
  return Number(result[0].insertId);
}

export async function deleteEventResult(resultId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(results).where(eq(results.id, resultId));
}

// Helper function to parse time string (HH:MM:SS or MM:SS) to seconds
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Helper function to parse pace string (MM:SS/km) to seconds per km
function parsePaceToSeconds(paceStr: string): number {
  const match = paceStr.match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}


// ==================== PASSWORD RESET ====================

export async function createPasswordResetToken(userId: number, email: string): Promise<{ code: string; token: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate 6-digit code and secure token
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = nanoid(64);
  
  // Expire in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  
  // Invalidate any existing tokens for this user
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(and(
      eq(passwordResetTokens.userId, userId),
      eq(passwordResetTokens.used, false)
    ));
  
  // Create new token
  await db.insert(passwordResetTokens).values({
    userId,
    email,
    code,
    token,
    expiresAt,
    used: false,
  });
  
  return { code, token };
}

export async function validatePasswordResetCode(email: string, code: string): Promise<{ valid: boolean; userId?: number; token?: string; reason?: 'not_found' | 'already_used' | 'expired' }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  
  // First, check if code exists for this email (regardless of used/expired status)
  const [existingToken] = await db.select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.email, email),
      eq(passwordResetTokens.code, code)
    ))
    .limit(1);
  
  // If code doesn't exist at all
  if (!existingToken) {
    return { valid: false, reason: 'not_found' };
  }
  
  // If code was already used
  if (existingToken.used) {
    return { valid: false, reason: 'already_used' };
  }
  
  // If code is expired
  if (existingToken.expiresAt < now) {
    return { valid: false, reason: 'expired' };
  }
  
  // Code is valid
  return { valid: true, userId: existingToken.userId, token: existingToken.token };
}

export async function usePasswordResetToken(token: string): Promise<{ success: boolean; userId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  
  const [resetToken] = await db.select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.token, token),
      eq(passwordResetTokens.used, false),
      gte(passwordResetTokens.expiresAt, now)
    ))
    .limit(1);
  
  if (!resetToken) {
    return { success: false };
  }
  
  // Mark as used
  await db.update(passwordResetTokens)
    .set({ used: true, usedAt: now })
    .where(eq(passwordResetTokens.id, resetToken.id));
  
  return { success: true, userId: resetToken.userId };
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Hash the new password
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
  const passwordHash = `${salt}:${hash}`;
  
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}



// ==================== VOUCHERS ====================

export async function createVoucher(data: {
  eventId?: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxUses?: number;
  minOrderValue?: string;
  validFrom?: Date;
  validUntil?: Date;
  description?: string;
  createdBy: number;
}): Promise<Voucher> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(vouchers).values({
    eventId: data.eventId,
    code: data.code.toUpperCase(),
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxUses: data.maxUses,
    minOrderValue: data.minOrderValue,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    description: data.description,
    createdBy: data.createdBy,
  });
  
  const [voucher] = await db.select().from(vouchers).where(eq(vouchers.id, result[0].insertId));
  return voucher;
}

export async function getVoucherByCode(code: string): Promise<Voucher | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(vouchers)
    .where(eq(vouchers.code, code.toUpperCase()))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getVouchersByEvent(eventId: number): Promise<Voucher[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vouchers)
    .where(or(
      eq(vouchers.eventId, eventId),
      isNull(vouchers.eventId)
    ))
    .orderBy(desc(vouchers.createdAt));
}

export async function getVouchersByCreator(createdBy: number): Promise<Voucher[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(vouchers)
    .where(eq(vouchers.createdBy, createdBy))
    .orderBy(desc(vouchers.createdAt));
}

export async function updateVoucher(id: number, data: Partial<InsertVoucher>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vouchers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vouchers.id, id));
}

export async function deleteVoucher(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vouchers).where(eq(vouchers.id, id));
}

export async function validateVoucher(code: string, eventId?: number, orderValue?: number): Promise<{
  valid: boolean;
  voucher?: Voucher;
  error?: string;
}> {
  const voucher = await getVoucherByCode(code);
  
  if (!voucher) {
    return { valid: false, error: 'Voucher não encontrado' };
  }
  
  if (!voucher.active) {
    return { valid: false, error: 'Voucher inativo' };
  }
  
  // Verificar se é específico de evento
  if (voucher.eventId && eventId && voucher.eventId !== eventId) {
    return { valid: false, error: 'Voucher não válido para este evento' };
  }
  
  // Verificar limite de usos
  if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
    return { valid: false, error: 'Voucher esgotado' };
  }
  
  // Verificar validade
  const now = new Date();
  if (voucher.validFrom && now < voucher.validFrom) {
    return { valid: false, error: 'Voucher ainda não está válido' };
  }
  if (voucher.validUntil && now > voucher.validUntil) {
    return { valid: false, error: 'Voucher expirado' };
  }
  
  // Verificar valor mínimo
  if (voucher.minOrderValue && orderValue && orderValue < parseFloat(voucher.minOrderValue)) {
    return { valid: false, error: `Valor mínimo para este voucher: R$ ${voucher.minOrderValue}` };
  }
  
  return { valid: true, voucher };
}

export async function useVoucher(voucherId: number, userId: number, registrationId?: number, discountApplied?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Incrementar uso
  await db.update(vouchers)
    .set({ currentUses: sql`${vouchers.currentUses} + 1` })
    .where(eq(vouchers.id, voucherId));
  
  // Registrar uso
  await db.insert(voucherUsages).values({
    voucherId,
    userId,
    registrationId,
    discountApplied: discountApplied || '0',
  });
}

export function calculateDiscount(voucher: Voucher, orderValue: number): number {
  if (voucher.discountType === 'percentage') {
    return orderValue * (parseFloat(voucher.discountValue) / 100);
  } else {
    return Math.min(parseFloat(voucher.discountValue), orderValue);
  }
}


// ==================== PUSH TOKENS ====================

export async function savePushToken(userId: number, token: string, platform: string, deviceName?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if token already exists for this user
  const existing = await db.select()
    .from(pushTokens)
    .where(and(
      eq(pushTokens.userId, userId),
      eq(pushTokens.token, token)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing token
    await db.update(pushTokens)
      .set({ active: true, platform, deviceName })
      .where(eq(pushTokens.id, existing[0].id));
  } else {
    // Insert new token
    await db.insert(pushTokens).values({
      userId,
      token,
      platform,
      deviceName,
      active: true,
    });
  }
}

export async function removePushToken(userId: number, token?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (token) {
    // Remove specific token
    await db.update(pushTokens)
      .set({ active: false })
      .where(and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.token, token)
      ));
  } else {
    // Remove all tokens for user
    await db.update(pushTokens)
      .set({ active: false })
      .where(eq(pushTokens.userId, userId));
  }
}

export async function getUserPushTokens(userId: number): Promise<PushToken[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(pushTokens)
    .where(and(
      eq(pushTokens.userId, userId),
      eq(pushTokens.active, true)
    ));
}

export async function getActiveUsersPushTokens(userIds: number[]): Promise<PushToken[]> {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  
  return await db.select()
    .from(pushTokens)
    .where(and(
      inArray(pushTokens.userId, userIds),
      eq(pushTokens.active, true)
    ));
}


// ==================== EVENT LIKES QUERIES ====================

export async function likeEvent(eventId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if already liked
    const existing = await db.select()
      .from(eventLikes)
      .where(and(
        eq(eventLikes.eventId, eventId),
        eq(eventLikes.userId, userId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return false; // Already liked
    }
    
    // Add like
    await db.insert(eventLikes).values({
      eventId,
      userId,
    });
    
    // Increment likesCount on event
    await db.update(events)
      .set({ likesCount: sql`${events.likesCount} + 1` })
      .where(eq(events.id, eventId));
    
    return true;
  } catch (error) {
    console.error('[DB] Error liking event:', error);
    return false;
  }
}

export async function unlikeEvent(eventId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if liked
    const existing = await db.select()
      .from(eventLikes)
      .where(and(
        eq(eventLikes.eventId, eventId),
        eq(eventLikes.userId, userId)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      return false; // Not liked
    }
    
    // Remove like
    await db.delete(eventLikes)
      .where(and(
        eq(eventLikes.eventId, eventId),
        eq(eventLikes.userId, userId)
      ));
    
    // Decrement likesCount on event
    await db.update(events)
      .set({ likesCount: sql`GREATEST(${events.likesCount} - 1, 0)` })
      .where(eq(events.id, eventId));
    
    return true;
  } catch (error) {
    console.error('[DB] Error unliking event:', error);
    return false;
  }
}

export async function isEventLikedByUser(eventId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const existing = await db.select()
    .from(eventLikes)
    .where(and(
      eq(eventLikes.eventId, eventId),
      eq(eventLikes.userId, userId)
    ))
    .limit(1);
  
  return existing.length > 0;
}

export async function getUserLikedEventIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const likes = await db.select({ eventId: eventLikes.eventId })
    .from(eventLikes)
    .where(eq(eventLikes.userId, userId));
  
  return likes.map(l => l.eventId);
}

// ==================== EVENT SHARES QUERIES ====================

export async function recordEventShare(
  eventId: number, 
  userId: number | null, 
  platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'copy_link' | 'other' = 'other'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Record share
    await db.insert(eventShares).values({
      eventId,
      userId,
      platform,
    });
    
    // Increment sharesCount on event
    await db.update(events)
      .set({ sharesCount: sql`${events.sharesCount} + 1` })
      .where(eq(events.id, eventId));
    
    return true;
  } catch (error) {
    console.error('[DB] Error recording share:', error);
    return false;
  }
}

export async function getEventSharesCount(eventId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(eventShares)
    .where(eq(eventShares.eventId, eventId));
  
  return result[0]?.count || 0;
}

export async function getEventSharesByPlatform(eventId: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select({
    platform: eventShares.platform,
    count: sql<number>`COUNT(*)`
  })
    .from(eventShares)
    .where(eq(eventShares.eventId, eventId))
    .groupBy(eventShares.platform);
  
  const platformCounts: Record<string, number> = {};
  result.forEach(r => {
    if (r.platform) {
      platformCounts[r.platform] = r.count;
    }
  });
  
  return platformCounts;
}

// ==================== ORGANIZER METRICS QUERIES ====================

export interface OrganizerMetrics {
  totalEvents: number;
  activeEvents: number;
  finishedEvents: number;
  cancelledEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  averageOccupancy: number;
}

export async function getOrganizerMetrics(organizerId: number): Promise<OrganizerMetrics> {
  const db = await getDb();
  if (!db) return {
    totalEvents: 0,
    activeEvents: 0,
    finishedEvents: 0,
    cancelledEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    averageOccupancy: 0
  };
  
  // Get events by organizer
  const organizerEvents = await db.select()
    .from(events)
    .where(eq(events.organizerId, organizerId));
  
  if (organizerEvents.length === 0) {
    return {
      totalEvents: 0,
      activeEvents: 0,
      finishedEvents: 0,
      cancelledEvents: 0,
      totalRegistrations: 0,
      totalRevenue: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      averageOccupancy: 0
    };
  }
  
  const eventIds = organizerEvents.map(e => e.id);
  
  // Count events by status
  const activeEvents = organizerEvents.filter(e => e.status === 'published').length;
  const finishedEvents = organizerEvents.filter(e => e.status === 'finished').length;
  const cancelledEvents = organizerEvents.filter(e => e.status === 'cancelled').length;
  
  // Sum metrics
  const totalViews = organizerEvents.reduce((sum, e) => sum + (e.viewCount || 0), 0);
  const totalLikes = organizerEvents.reduce((sum, e) => sum + (e.likesCount || 0), 0);
  const totalShares = organizerEvents.reduce((sum, e) => sum + (e.sharesCount || 0), 0);
  
  // Get registrations
  const regs = await db.select()
    .from(registrations)
    .where(inArray(registrations.eventId, eventIds));
  
  const totalRegistrations = regs.length;
  const paidRegs = regs.filter(r => r.paymentStatus === 'paid');
  const totalRevenue = paidRegs.reduce((sum, r) => sum + parseFloat(r.totalPrice || '0'), 0);
  
  return {
    totalEvents: organizerEvents.length,
    activeEvents,
    finishedEvents,
    cancelledEvents,
    totalRegistrations,
    totalRevenue,
    totalViews,
    totalLikes,
    totalShares,
    averageOccupancy: totalRegistrations > 0 ? Math.round((totalRegistrations / (organizerEvents.length * 100)) * 100) : 0
  };
}

export interface EventMetricsDetail {
  id: number;
  name: string;
  eventDate: Date;
  status: string;
  registrations: number;
  paidRegistrations: number;
  revenue: number;
  views: number;
  likes: number;
  shares: number;
  occupancyRate: number;
  conversionRate: number; // views -> registrations
}

export async function getOrganizerEventMetrics(organizerId: number): Promise<EventMetricsDetail[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get events by organizer
  const organizerEvents = await db.select()
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.eventDate));
  
  if (organizerEvents.length === 0) return [];
  
  // Get registrations for all events
  const eventIds = organizerEvents.map(e => e.id);
  const allRegs = await db.select()
    .from(registrations)
    .where(inArray(registrations.eventId, eventIds));
  
  // Build metrics for each event
  return organizerEvents.map(event => {
    const eventRegs = allRegs.filter(r => r.eventId === event.id);
    const paidRegs = eventRegs.filter(r => r.paymentStatus === 'paid');
    const revenue = paidRegs.reduce((sum, r) => sum + parseFloat(r.totalPrice || '0'), 0);
    const views = event.viewCount || 0;
    const likes = event.likesCount || 0;
    const shares = event.sharesCount || 0;
    const conversionRate = views > 0 ? Math.round((eventRegs.length / views) * 100) : 0;
    
    return {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      status: event.status,
      registrations: eventRegs.length,
      paidRegistrations: paidRegs.length,
      revenue,
      views,
      likes,
      shares,
      occupancyRate: Math.round((eventRegs.length / 100) * 100), // Assuming 100 capacity
      conversionRate
    };
  });
}


// ==================== CITIES SEARCH ====================
import citiesData from '../shared/cities-brazil.json';

interface City {
  Id: number;
  Codigo: number;
  Nome: string;
  Uf: string;
}

// Normalize string for search (remove accents, lowercase)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function searchCities(query: string, limit: number = 15): Promise<{ name: string; state: string; fullName: string }[]> {
  const normalizedQuery = normalizeString(query);
  
  const cities = ((citiesData as { data: City[] }).data)
    .filter(city => {
      const normalizedName = normalizeString(city.Nome);
      return normalizedName.includes(normalizedQuery);
    })
    .slice(0, limit)
    .map(city => ({
      name: city.Nome,
      state: city.Uf,
      fullName: `${city.Nome}, ${city.Uf}`
    }));
  
  return cities;
}


// ============================================
// SOCIAL FEED QUERIES - Fase 3 do Roadmap
// ============================================

// Social tables already imported at top of file

// ==================== POSTS ====================

export async function createPost(post: InsertPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(posts).values({
    ...post,
    reactions: JSON.stringify({ like: 0, love: 0, fire: 0, clap: 0, strong: 0 }),
  });
  
  // Update group post count if groupId exists
  if (post.groupId) {
    await db.update(groups)
      .set({ postCount: sql`${groups.postCount} + 1` })
      .where(eq(groups.id, post.groupId));
  }
  
  return result[0].insertId;
}

export async function getPostById(postId: number): Promise<Post | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeedPosts(options: {
  userId?: number;
  groupId?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { userId, groupId, limit = 20, offset = 0 } = options;
  
  let query = db.select({
    post: posts,
    author: {
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
    },
    group: {
      id: groups.id,
      name: groups.name,
      logoUrl: groups.logoUrl,
    },
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .leftJoin(groups, eq(posts.groupId, groups.id))
  .where(and(
    eq(posts.status, 'active'),
    eq(posts.moderationStatus, 'approved'),
    groupId ? eq(posts.groupId, groupId) : undefined
  ))
  .orderBy(desc(posts.createdAt))
  .limit(limit)
  .offset(offset);
  
  const result = await query;
  
  // Get user's likes for these posts
  let userLikes: number[] = [];
  let userSavedPosts: number[] = [];
  
  if (userId && result.length > 0) {
    const postIds = result.map(r => r.post.id);
    
    // Get likes
    const likes = await db.select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(
        inArray(postLikes.postId, postIds),
        eq(postLikes.userId, userId)
      ));
    userLikes = likes.map(l => l.postId);
    
    // Get saved posts
    userSavedPosts = await getUserSavedPosts(userId, postIds);
  }
  
  return result.map(r => ({
    ...r.post,
    author: r.author,
    group: r.group,
    isLiked: userLikes.includes(r.post.id),
    isSaved: userSavedPosts.includes(r.post.id),
    reactions: r.post.reactions ? JSON.parse(r.post.reactions as string) : { like: 0, love: 0, fire: 0, clap: 0, strong: 0 },
    activityData: r.post.activityData ? (typeof r.post.activityData === 'string' ? JSON.parse(r.post.activityData) : r.post.activityData) : null,
    pollOptions: r.post.pollOptions ? (typeof r.post.pollOptions === 'string' ? JSON.parse(r.post.pollOptions) : r.post.pollOptions) : null,
  }));
}

export async function deletePost(postId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Check if user is author
  const post = await getPostById(postId);
  if (!post || post.authorId !== userId) return false;
  
  await db.update(posts)
    .set({ status: 'deleted' })
    .where(eq(posts.id, postId));
  
  return true;
}

// ==================== POST LIKES ====================

export async function likePost(postId: number, userId: number, reactionType: 'like' | 'love' | 'fire' | 'clap' | 'strong' = 'like'): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if already liked
    const existing = await db.select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    
    if (existing.length > 0) {
      // Update reaction type if different
      if (existing[0].reactionType !== reactionType) {
        const oldReaction = existing[0].reactionType;
        
        await db.update(postLikes)
          .set({ reactionType })
          .where(eq(postLikes.id, existing[0].id));
        
        // Update reactions count on post
        const post = await getPostById(postId);
        if (post && post.reactions) {
          const reactions = typeof post.reactions === 'string' ? JSON.parse(post.reactions) : post.reactions;
          reactions[oldReaction] = Math.max(0, (reactions[oldReaction] || 0) - 1);
          reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          
          await db.update(posts)
            .set({ reactions: JSON.stringify(reactions) })
            .where(eq(posts.id, postId));
        }
      }
      return true;
    }
    
    // Insert new like
    await db.insert(postLikes).values({ postId, userId, reactionType });
    
    // Update counts on post
    const post = await getPostById(postId);
    
    // Create notification for post author (if not liking own post)
    if (post && post.userId !== userId) {
      await createSocialNotification(post.userId, userId, 'like', { postId });
    }
    if (post) {
      const reactions = post.reactions ? (typeof post.reactions === 'string' ? JSON.parse(post.reactions) : post.reactions) : { like: 0, love: 0, fire: 0, clap: 0, strong: 0 };
      reactions[reactionType] = (reactions[reactionType] || 0) + 1;
      
      await db.update(posts)
        .set({ 
          likesCount: sql`${posts.likesCount} + 1`,
          reactions: JSON.stringify(reactions)
        })
        .where(eq(posts.id, postId));
    }
    
    return true;
  } catch (error) {
    console.error("[DB] Error liking post:", error);
    return false;
  }
}

export async function unlikePost(postId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Get existing like
    const existing = await db.select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    
    if (existing.length === 0) return false;
    
    const reactionType = existing[0].reactionType;
    
    // Delete like
    await db.delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    
    // Update counts on post
    const post = await getPostById(postId);
    if (post) {
      const reactions = post.reactions ? (typeof post.reactions === 'string' ? JSON.parse(post.reactions) : post.reactions) : { like: 0, love: 0, fire: 0, clap: 0, strong: 0 };
      reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
      
      await db.update(posts)
        .set({ 
          likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)`,
          reactions: JSON.stringify(reactions)
        })
        .where(eq(posts.id, postId));
    }
    
    return true;
  } catch (error) {
    console.error("[DB] Error unliking post:", error);
    return false;
  }
}

export async function getUserPostLikes(userId: number, postIds: number[]): Promise<number[]> {
  const db = await getDb();
  if (!db || postIds.length === 0) return [];
  
  const likes = await db.select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(
      inArray(postLikes.postId, postIds),
      eq(postLikes.userId, userId)
    ));
  
  return likes.map(l => l.postId);
}

// ==================== COMMENTS ====================

export async function createComment(comment: InsertComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(comments).values(comment);
  const commentId = result[0].insertId;
  
  // Update comment count on post
  await db.update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, comment.postId));
  
  // Update reply count on parent comment if exists
  if (comment.parentId) {
    await db.update(comments)
      .set({ repliesCount: sql`${comments.repliesCount} + 1` })
      .where(eq(comments.id, comment.parentId));
  }
  
  // Create notification for post author (if not commenting on own post)
  const post = await getPostById(comment.postId);
  if (post && post.userId !== comment.userId) {
    await createSocialNotification(post.userId, comment.userId, 'comment', { 
      postId: comment.postId, 
      commentId 
    });
  }
  
  return commentId;
}

export async function getPostComments(postId: number, options: {
  userId?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const { userId, limit = 50, offset = 0 } = options;
  
  const result = await db.select({
    comment: comments,
    author: {
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
    },
  })
  .from(comments)
  .leftJoin(users, eq(comments.authorId, users.id))
  .where(and(
    eq(comments.postId, postId),
    eq(comments.status, 'active'),
    isNull(comments.parentId) // Only top-level comments
  ))
  .orderBy(desc(comments.createdAt))
  .limit(limit)
  .offset(offset);
  
  // Get user's likes for these comments
  let userLikes: number[] = [];
  if (userId && result.length > 0) {
    const commentIds = result.map(r => r.comment.id);
    const likes = await db.select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(and(
        inArray(commentLikes.commentId, commentIds),
        eq(commentLikes.userId, userId)
      ));
    userLikes = likes.map(l => l.commentId);
  }
  
  return result.map(r => ({
    ...r.comment,
    author: r.author,
    isLiked: userLikes.includes(r.comment.id),
  }));
}

export async function getCommentReplies(commentId: number, userId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    comment: comments,
    author: {
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
    },
  })
  .from(comments)
  .leftJoin(users, eq(comments.authorId, users.id))
  .where(and(
    eq(comments.parentId, commentId),
    eq(comments.status, 'active')
  ))
  .orderBy(asc(comments.createdAt));
  
  return result.map(r => ({
    ...r.comment,
    author: r.author,
  }));
}

export async function deleteComment(commentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Get comment
  const comment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (comment.length === 0 || comment[0].authorId !== userId) return false;
  
  await db.update(comments)
    .set({ status: 'deleted' })
    .where(eq(comments.id, commentId));
  
  // Update comment count on post
  await db.update(posts)
    .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
    .where(eq(posts.id, comment[0].postId));
  
  return true;
}

// Alias for backward compatibility
export async function getComments(postId: number, userId?: number, limit?: number, offset?: number): Promise<any[]> {
  return getPostComments(postId, { userId, limit, offset });
}

// ==================== COMMENT LIKES ====================

export async function likeComment(commentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if already liked
    const existing = await db.select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
      .limit(1);
    
    if (existing.length > 0) return true; // Already liked
    
    // Insert like
    await db.insert(commentLikes).values({ commentId, userId });
    
    // Update count
    await db.update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, commentId));
    
    return true;
  } catch (error) {
    console.error("[DB] Error liking comment:", error);
    return false;
  }
}

export async function unlikeComment(commentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
    
    await db.update(comments)
      .set({ likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)` })
      .where(eq(comments.id, commentId));
    
    return true;
  } catch (error) {
    console.error("[DB] Error unliking comment:", error);
    return false;
  }
}

// ==================== REPORTS ====================

export async function createReport(report: InsertReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reports).values(report);
  return result[0].insertId;
}

export async function getReportsByTarget(targetType: string, targetId: number): Promise<Report[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(reports)
    .where(and(
      eq(reports.targetType, targetType as any),
      eq(reports.targetId, targetId)
    ));
}

export async function hasUserReported(userId: number, targetType: string, targetId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select()
    .from(reports)
    .where(and(
      eq(reports.reporterId, userId),
      eq(reports.targetType, targetType as any),
      eq(reports.targetId, targetId)
    ))
    .limit(1);
  
  return result.length > 0;
}

export async function countReportsByTarget(targetType: string, targetId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(and(
      eq(reports.targetType, targetType as any),
      eq(reports.targetId, targetId)
    ));
  
  return result[0]?.count || 0;
}

export async function hidePostForReview(postId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Marcar post como oculto para revisão (usando status ou flag)
  await db.update(posts)
    .set({ status: 'hidden_for_review' })
    .where(eq(posts.id, postId));
}

export async function createReportEvent(event: {
  reportId: number;
  eventType: string;
  details?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Log de auditoria - por enquanto apenas console, pode ser expandido para tabela
  console.log('[REPORT_AUDIT]', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export async function getCommentById(commentId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  
  return result[0] || null;
}

export async function getGroupById(groupId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  
  return result[0] || null;
}

// Funções de moderação
export async function getPendingReports(options?: { 
  priority?: 'high' | 'normal'; 
  limit?: number;
  offset?: number;
}): Promise<Report[]> {
  const db = await getDb();
  if (!db) return [];
  
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  return await db.select()
    .from(reports)
    .where(eq(reports.status, 'pending'))
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function resolveReport(
  reportId: number, 
  resolution: 'no_action' | 'warning' | 'content_removed' | 'user_banned',
  resolvedBy: number,
  note?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(reports)
    .set({
      status: 'resolved',
      resolution,
      resolvedBy,
      resolutionNote: note,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, reportId));
}

export async function getReportStats(): Promise<{
  total: number;
  pending: number;
  resolved: number;
  byReason: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, resolved: 0, byReason: {} };
  
  const total = await db.select({ count: sql<number>`count(*)` }).from(reports);
  const pending = await db.select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, 'pending'));
  const resolved = await db.select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, 'resolved'));
  
  return {
    total: total[0]?.count || 0,
    pending: pending[0]?.count || 0,
    resolved: resolved[0]?.count || 0,
    byReason: {},
  };
}

// ==================== GROUPS ====================

export async function createGroup(group: InsertGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(groups).values(group);
  const groupId = result[0].insertId;
  
  // Add owner as member
  await db.insert(groupMembers).values({
    groupId,
    userId: group.ownerId,
    role: 'owner',
    status: 'active',
  });
  
  // Update member count
  await db.update(groups)
    .set({ memberCount: 1 })
    .where(eq(groups.id, groupId));
  
  return groupId;
}

export async function getUserGroups(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    group: groups,
    membership: groupMembers,
  })
  .from(groupMembers)
  .innerJoin(groups, eq(groupMembers.groupId, groups.id))
  .where(and(
    eq(groupMembers.userId, userId),
    eq(groupMembers.status, 'active'),
    eq(groups.status, 'active')
  ));
  
  return result.map(r => ({
    ...r.group,
    role: r.membership.role,
  }));
}

export async function joinGroup(groupId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const group = await getGroupById(groupId);
    if (!group) return false;
    
    const status = group.requiresApproval ? 'pending' : 'active';
    
    await db.insert(groupMembers).values({
      groupId,
      userId,
      role: 'member',
      status,
    });
    
    if (status === 'active') {
      await db.update(groups)
        .set({ memberCount: sql`${groups.memberCount} + 1` })
        .where(eq(groups.id, groupId));
    }
    
    return true;
  } catch (error) {
    console.error("[DB] Error joining group:", error);
    return false;
  }
}

export async function leaveGroup(groupId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if user is owner
    const membership = await db.select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    
    if (membership.length === 0) return false;
    if (membership[0].role === 'owner') return false; // Owner can't leave
    
    await db.delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    
    await db.update(groups)
      .set({ memberCount: sql`GREATEST(${groups.memberCount} - 1, 0)` })
      .where(eq(groups.id, groupId));
    
    return true;
  } catch (error) {
    console.error("[DB] Error leaving group:", error);
    return false;
  }
}

export async function isGroupMember(groupId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select()
    .from(groupMembers)
    .where(and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.status, 'active')
    ))
    .limit(1);
  
  return result.length > 0;
}


// ==================== SAVED POSTS ====================

export async function savePost(userId: number, postId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if already saved
    const existing = await db.execute(
      sql`SELECT id FROM saved_posts WHERE userId = ${userId} AND postId = ${postId} LIMIT 1`
    );
    
    if ((existing as any)[0]?.length > 0) return true; // Already saved
    
    await db.execute(
      sql`INSERT INTO saved_posts (userId, postId) VALUES (${userId}, ${postId})`
    );
    
    return true;
  } catch (error) {
    console.error("[DB] Error saving post:", error);
    return false;
  }
}

export async function unsavePost(userId: number, postId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`DELETE FROM saved_posts WHERE userId = ${userId} AND postId = ${postId}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error unsaving post:", error);
    return false;
  }
}

export async function getUserSavedPosts(userId: number, postIds: number[]): Promise<number[]> {
  const db = await getDb();
  if (!db || postIds.length === 0) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT postId FROM saved_posts WHERE userId = ${userId} AND postId IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    return ((result as any)[0] || []).map((r: any) => r.postId);
  } catch (error) {
    console.error("[DB] Error getting saved posts:", error);
    return [];
  }
}

export async function getSavedPostsByUser(userId: number, limit = 20, offset = 0): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT p.*, u.name as authorName, u.photoUrl as authorPhotoUrl, g.name as groupName, g.logoUrl as groupLogoUrl
          FROM saved_posts sp
          JOIN posts p ON sp.postId = p.id
          LEFT JOIN users u ON p.authorId = u.id
          LEFT JOIN \`groups\` g ON p.groupId = g.id
          WHERE sp.userId = ${userId} AND p.status = 'active'
          ORDER BY sp.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}`
    );
    
    return (result as any)[0] || [];
  } catch (error) {
    console.error("[DB] Error getting saved posts by user:", error);
    return [];
  }
}

export async function sharePost(postId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(posts)
      .set({ sharesCount: sql`${posts.sharesCount} + 1` })
      .where(eq(posts.id, postId));
    return true;
  } catch (error) {
    console.error("[DB] Error incrementing share count:", error);
    return false;
  }
}


// ==================== FOLLOW SYSTEM ====================

export async function followUser(followerId: number, followingId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  try {
    // Check if already following
    const existing = await db.select()
      .from(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      ))
      .limit(1);
    
    if (existing.length > 0) return; // Already following
    
    // Create follow relationship
    await db.insert(userFollows).values({
      followerId,
      followingId,
      createdAt: new Date(),
    });
    
    // Update follower's following count
    await db.update(users)
      .set({ followingCount: sql`COALESCE(${users.followingCount}, 0) + 1` })
      .where(eq(users.id, followerId));
    
    // Update target's followers count
    await db.update(users)
      .set({ followersCount: sql`COALESCE(${users.followersCount}, 0) + 1` })
      .where(eq(users.id, followingId));
    
  } catch (error) {
    console.error("[DB] Error following user:", error);
    throw error;
  }
}

export async function unfollowUser(followerId: number, followingId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  try {
    // Delete follow relationship
    const result = await db.delete(userFollows)
      .where(and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      ));
    
    // Update counts only if a row was deleted
    // Update follower's following count
    await db.update(users)
      .set({ followingCount: sql`GREATEST(COALESCE(${users.followingCount}, 0) - 1, 0)` })
      .where(eq(users.id, followerId));
    
    // Update target's followers count
    await db.update(users)
      .set({ followersCount: sql`GREATEST(COALESCE(${users.followersCount}, 0) - 1, 0)` })
      .where(eq(users.id, followingId));
    
  } catch (error) {
    console.error("[DB] Error unfollowing user:", error);
    throw error;
  }
}

export async function getFollowers(
  userId: number, 
  currentUserId?: number,
  limit: number = 20, 
  offset: number = 0
): Promise<{ users: any[], total: number }> {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  
  try {
    // Get followers
    const followers = await db.select({
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
      bio: users.bio,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerId, users.id))
    .where(eq(userFollows.followingId, userId))
    .orderBy(desc(userFollows.createdAt))
    .limit(limit)
    .offset(offset);
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));
    
    const total = Number(countResult[0]?.count || 0);
    
    // Check if current user is following each follower
    let followersWithStatus = followers;
    if (currentUserId) {
      const followingIds = await db.select({ followingId: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, currentUserId));
      
      const followingSet = new Set(followingIds.map(f => f.followingId));
      
      followersWithStatus = followers.map(f => ({
        ...f,
        isFollowing: followingSet.has(f.id),
        isCurrentUser: f.id === currentUserId,
      }));
    }
    
    return { users: followersWithStatus, total };
  } catch (error) {
    console.error("[DB] Error getting followers:", error);
    return { users: [], total: 0 };
  }
}

export async function getFollowing(
  userId: number, 
  currentUserId?: number,
  limit: number = 20, 
  offset: number = 0
): Promise<{ users: any[], total: number }> {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  
  try {
    // Get following
    const following = await db.select({
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
      bio: users.bio,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .where(eq(userFollows.followerId, userId))
    .orderBy(desc(userFollows.createdAt))
    .limit(limit)
    .offset(offset);
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    
    const total = Number(countResult[0]?.count || 0);
    
    // Check if current user is following each user
    let followingWithStatus = following;
    if (currentUserId) {
      const currentUserFollowing = await db.select({ followingId: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, currentUserId));
      
      const followingSet = new Set(currentUserFollowing.map(f => f.followingId));
      
      followingWithStatus = following.map(f => ({
        ...f,
        isFollowing: followingSet.has(f.id),
        isCurrentUser: f.id === currentUserId,
      }));
    }
    
    return { users: followingWithStatus, total };
  } catch (error) {
    console.error("[DB] Error getting following:", error);
    return { users: [], total: 0 };
  }
}

// ==================== POST DETAIL ====================

export async function getPostDetail(postId: number, currentUserId?: number): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const postResult = await db.select({
      id: posts.id,
      content: posts.content,
      type: posts.type,
      imageUrl: posts.imageUrl,
      videoUrl: posts.videoUrl,
      videoThumbnailUrl: posts.videoThumbnailUrl,

      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      sharesCount: posts.sharesCount,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorPhotoUrl: users.photoUrl,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);
    
    if (postResult.length === 0) return null;
    
    const post = postResult[0];
    
    // Check if current user liked/saved the post
    let isLiked = false;
    let isSaved = false;
    
    if (currentUserId) {
      const likeResult = await db.select()
        .from(postLikes)
        .where(and(
          eq(postLikes.postId, postId),
          eq(postLikes.userId, currentUserId)
        ))
        .limit(1);
      isLiked = likeResult.length > 0;
      
      const saveResult = await db.select()
        .from(savedPosts)
        .where(and(
          eq(savedPosts.postId, postId),
          eq(savedPosts.userId, currentUserId)
        ))
        .limit(1);
      isSaved = saveResult.length > 0;
    }
    
    return {
      ...post,
      isLiked,
      isSaved,
      author: {
        id: post.authorId,
        name: post.authorName,
        photoUrl: post.authorPhotoUrl,
      },
    };
  } catch (error) {
    console.error("[DB] Error getting post detail:", error);
    return null;
  }
}

// ==================== CHAT SYSTEM ====================

export async function getOrCreateChatThread(userId: number, recipientId: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  try {
    // Check if thread already exists
    const existingThread = await db.select()
      .from(chatThreads)
      .where(
        or(
          and(
            eq(chatThreads.user1Id, userId),
            eq(chatThreads.user2Id, recipientId)
          ),
          and(
            eq(chatThreads.user1Id, recipientId),
            eq(chatThreads.user2Id, userId)
          )
        )
      )
      .limit(1);
    
    if (existingThread.length > 0) {
      return existingThread[0];
    }
    
    // Create new thread
    const result = await db.insert(chatThreads).values({
      user1Id: userId,
      user2Id: recipientId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const threadId = Number(result[0].insertId);
    
    return {
      id: threadId,
      user1Id: userId,
      user2Id: recipientId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("[DB] Error creating chat thread:", error);
    throw error;
  }
}

export async function getChatMessages(
  threadId: number, 
  limit: number = 50, 
  offset: number = 0
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const messages = await db.select({
      id: chatMessages.id,
      threadId: chatMessages.threadId,
      senderId: chatMessages.senderId,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      senderName: users.name,
      senderPhotoUrl: users.photoUrl,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error("[DB] Error getting chat messages:", error);
    return [];
  }
}

export async function sendChatMessage(
  threadId: number, 
  senderId: number, 
  content: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  try {
    const result = await db.insert(chatMessages).values({
      threadId,
      senderId,
      content,
      createdAt: new Date(),
    });
    
    // Update thread's updatedAt
    await db.update(chatThreads)
      .set({ updatedAt: new Date(), lastMessage: content })
      .where(eq(chatThreads.id, threadId));
    
    const messageId = Number(result[0].insertId);
    
    return {
      id: messageId,
      threadId,
      senderId,
      content,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("[DB] Error sending chat message:", error);
    throw error;
  }
}

export async function getUserChatThreads(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const threads = await db.select()
      .from(chatThreads)
      .where(
        or(
          eq(chatThreads.user1Id, userId),
          eq(chatThreads.user2Id, userId)
        )
      )
      .orderBy(desc(chatThreads.updatedAt));
    
    // Get user info, last message and unread count for each thread
    const threadsWithUsers = await Promise.all(threads.map(async (thread) => {
      const otherUserId = thread.user1Id === userId ? thread.user2Id : thread.user1Id;
      const otherUser = await db.select({
        id: users.id,
        name: users.name,
        photoUrl: users.photoUrl,
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);
      
      // Get last message
      const lastMessageResult = await db.select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, thread.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      
      // Get unread count
      const unreadResult = await db.select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.threadId, thread.id),
            ne(chatMessages.senderId, userId),
            eq(chatMessages.isRead, false)
          )
        );
      
      const lastMsg = lastMessageResult[0] || null;
      const unreadCount = unreadResult[0]?.count || 0;
      
      return {
        ...thread,
        otherUser: otherUser[0] || null,
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          content: lastMsg.content,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead,
        } : null,
        unreadCount: Number(unreadCount),
      };
    }));
    
    return threadsWithUsers;
  } catch (error) {
    console.error("[DB] Error getting user chat threads:", error);
    return [];
  }
}


// ==================== SEARCH AND PROFILE ====================

export async function searchUsers(
  query: string,
  currentUserId?: number,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const searchPattern = `%${query}%`;
    
    const results = await db.select({
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
      city: users.city,
      state: users.state,
      gridBio: users.gridBio,
      followersCount: users.followersCount,
      followingCount: users.followingCount,
    })
    .from(users)
    .where(
      and(
        like(users.name, searchPattern),
        eq(users.role, 'user')
      )
    )
    .orderBy(users.name)
    .limit(limit)
    .offset(offset);
    
    // Check if current user is following each result
    if (currentUserId) {
      const followingIds = await db.select({ followingId: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, currentUserId));
      
      const followingSet = new Set(followingIds.map(f => f.followingId));
      
      return results.map(user => ({
        ...user,
        isFollowing: followingSet.has(user.id),
        postsCount: 0, // Will be calculated separately if needed
      }));
    }
    
    return results.map(user => ({
      ...user,
      isFollowing: false,
      postsCount: 0,
    }));
  } catch (error) {
    console.error("[DB] Error searching users:", error);
    return [];
  }
}

export async function getAthleteProfile(
  userId: number,
  currentUserId?: number
): Promise<{
  profile: {
    id: number;
    name: string;
    username: string | null;
    photoUrl: string | null;
    bio: string | null;
    gridBio: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    athleteCategory: 'profissional' | 'amador' | 'instrutor' | null;
    sports: string | null;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
  posts: Array<{
    id: number;
    thumbnailUrl: string | null;
    mediaType: 'image' | 'video';
  }>;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // Get user profile
    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return null;
    }
    
    const user = userResult[0];
    
    // Get posts count
    const postsCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.authorId, userId));
    
    const postsCount = postsCountResult[0]?.count || 0;
    
    // Get user's posts with images/videos for grid
    const userPosts = await db.select({
      id: posts.id,
      imageUrl: posts.imageUrl,
      videoUrl: posts.videoUrl,
      videoThumbnailUrl: posts.videoThumbnailUrl,
      type: posts.type,
    })
    .from(posts)
    .where(
      and(
        eq(posts.authorId, userId),
        eq(posts.status, 'active'),
        or(
          isNotNull(posts.imageUrl),
          isNotNull(posts.videoUrl)
        )
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(30);
    
    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const followResult = await db.select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, currentUserId),
            eq(userFollows.followingId, userId)
          )
        )
        .limit(1);
      
      isFollowing = followResult.length > 0;
    }
    
    return {
      profile: {
        id: user.id,
        name: user.name || 'Usuário',
        username: user.username || null,
        photoUrl: user.photoUrl,
        bio: user.bio || null,
        gridBio: user.gridBio || null,
        city: user.city,
        state: user.state,
        country: (user as any).country || null,
        athleteCategory: (user as any).athleteCategory || null,
        sports: (user as any).sports || null,
        postsCount: Number(postsCount),
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        isFollowing,
      },
      posts: userPosts.map(post => ({
        id: post.id,
        thumbnailUrl: post.videoThumbnailUrl || post.imageUrl,
        mediaType: post.videoUrl ? 'video' as const : 'image' as const,
        videoUrl: post.videoUrl || null,
        content: null, // Content loaded on demand in PostDetail
      })),
    };
  } catch (error) {
    console.error("[DB] Error getting athlete profile:", error);
    return null;
  }
}

export async function updateUserGridBio(userId: number, gridBio: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.update(users)
      .set({ gridBio })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("[DB] Error updating grid bio:", error);
    throw error;
  }
}


// Update grid profile with all fields
export async function updateGridProfile(
  userId: number, 
  data: {
    gridBio?: string;
    city?: string;
    state?: string;
    country?: string;
    athleteCategory?: 'PRO' | 'AMATEUR' | 'COACH';
    sports?: string[];
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    const updateData: Record<string, any> = {};
    
    if (data.gridBio !== undefined) updateData.gridBio = data.gridBio;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.athleteCategory !== undefined) updateData.athleteCategory = data.athleteCategory;
    if (data.sports !== undefined) updateData.sports = JSON.stringify(data.sports);
    
    if (Object.keys(updateData).length > 0) {
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));
    }
  } catch (error) {
    console.error("[DB] Error updating grid profile:", error);
    throw error;
  }
}

// Get suggested users to follow
export async function getSuggestedUsers(userId: number, limit: number = 20): Promise<{
  users: Array<{
    id: number;
    name: string;
    photoUrl: string | null;
    gridBio: string | null;
    city: string | null;
    followersCount: number;
    isFollowing: boolean;
  }>;
}> {
  const db = await getDb();
  if (!db) return { users: [] };
  
  try {
    // Get users that the current user is NOT following
    // Prioritize users with photos and more followers
    const suggestedUsers = await db.select({
      id: users.id,
      name: users.name,
      photoUrl: users.photoUrl,
      gridBio: users.gridBio,
      city: users.city,
      followersCount: users.followersCount,
    })
    .from(users)
    .where(
      and(
        ne(users.id, userId),
        isNotNull(users.name),
        // Exclude users already being followed
        notInArray(
          users.id,
          db.select({ id: userFollows.followingId })
            .from(userFollows)
            .where(eq(userFollows.followerId, userId))
        )
      )
    )
    .orderBy(
      desc(users.followersCount),
      desc(users.createdAt)
    )
    .limit(limit);
    
    return {
      users: suggestedUsers.map(u => ({
        id: u.id,
        name: u.name || 'Usuário',
        photoUrl: u.photoUrl,
        gridBio: u.gridBio,
        city: u.city,
        followersCount: u.followersCount || 0,
        isFollowing: false, // By definition, these are not followed
      })),
    };
  } catch (error) {
    console.error("[DB] Error getting suggested users:", error);
    return { users: [] };
  }
}


// ============================================
// MUTUAL FOLLOW & CHAT SYSTEM FUNCTIONS
// ============================================

// Check if two users mutually follow each other (required for chat)
export async function checkMutualFollow(userId: number, otherUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Check if userId follows otherUserId
    const userFollowsOther = await db.select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, userId),
          eq(userFollows.followingId, otherUserId)
        )
      )
      .limit(1);
    
    // Check if otherUserId follows userId
    const otherFollowsUser = await db.select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, otherUserId),
          eq(userFollows.followingId, userId)
        )
      )
      .limit(1);
    
    return userFollowsOther.length > 0 && otherFollowsUser.length > 0;
  } catch (error) {
    console.error("[DB] Error checking mutual follow:", error);
    return false;
  }
}

// Get or create chat thread (only if mutual follow exists)
export async function getOrCreateChatThreadSafe(userId: number, otherUserId: number): Promise<{ threadId: number | null; error?: string }> {
  const db = await getDb();
  if (!db) return { threadId: null, error: "Database unavailable" };
  
  try {
    // First check mutual follow
    const isMutual = await checkMutualFollow(userId, otherUserId);
    if (!isMutual) {
      return { threadId: null, error: "Chat only available between mutual followers" };
    }
    
    // Check if user is blocked
    const isBlocked = await checkIfBlocked(userId, otherUserId);
    if (isBlocked) {
      return { threadId: null, error: "Cannot chat with this user" };
    }
    
    // Check for existing thread
    const existingThread = await db.select()
      .from(chatThreads)
      .where(
        or(
          and(
            eq(chatThreads.user1Id, userId),
            eq(chatThreads.user2Id, otherUserId)
          ),
          and(
            eq(chatThreads.user1Id, otherUserId),
            eq(chatThreads.user2Id, userId)
          )
        )
      )
      .limit(1);
    
    if (existingThread.length > 0) {
      return { threadId: existingThread[0].id };
    }
    
    // Create new thread
    const result = await db.insert(chatThreads).values({
      user1Id: userId,
      user2Id: otherUserId,
    });
    
    return { threadId: Number(result[0].insertId) };
  } catch (error) {
    console.error("[DB] Error creating chat thread:", error);
    return { threadId: null, error: "Failed to create chat" };
  }
}

// Check if user is blocked
export async function checkIfBlocked(userId: number, otherUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const blocked = await db.execute(
      sql`SELECT id FROM user_blocks WHERE (blockerId = ${userId} AND blockedId = ${otherUserId}) OR (blockerId = ${otherUserId} AND blockedId = ${userId}) LIMIT 1`
    );
    return (blocked[0] as any[]).length > 0;
  } catch (error) {
    console.error("[DB] Error checking block status:", error);
    return false;
  }
}

// Block a user
export async function blockUser(blockerId: number, blockedId: number, reason?: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };
  
  try {
    await db.execute(
      sql`INSERT INTO user_blocks (blockerId, blockedId, reason) VALUES (${blockerId}, ${blockedId}, ${reason || null}) ON DUPLICATE KEY UPDATE reason = ${reason || null}`
    );
    
    // Also unfollow each other
    await db.delete(userFollows).where(
      and(
        eq(userFollows.followerId, blockerId),
        eq(userFollows.followingId, blockedId)
      )
    );
    await db.delete(userFollows).where(
      and(
        eq(userFollows.followerId, blockedId),
        eq(userFollows.followingId, blockerId)
      )
    );
    
    return { success: true };
  } catch (error) {
    console.error("[DB] Error blocking user:", error);
    return { success: false, error: "Failed to block user" };
  }
}

// Unblock a user
export async function unblockUser(blockerId: number, blockedId: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  try {
    await db.execute(
      sql`DELETE FROM user_blocks WHERE blockerId = ${blockerId} AND blockedId = ${blockedId}`
    );
    return { success: true };
  } catch (error) {
    console.error("[DB] Error unblocking user:", error);
    return { success: false };
  }
}

// Report a user/post/message
export async function reportContent(
  reporterId: number,
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'fake_profile' | 'other',
  description?: string,
  reportedUserId?: number,
  reportedPostId?: number,
  reportedMessageId?: number
): Promise<{ success: boolean; reportId?: number }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  try {
    const result = await db.execute(
      sql`INSERT INTO user_reports (reporterId, reportedUserId, reportedPostId, reportedMessageId, reason, description) 
          VALUES (${reporterId}, ${reportedUserId || null}, ${reportedPostId || null}, ${reportedMessageId || null}, ${reason}, ${description || null})`
    );
    return { success: true, reportId: Number((result[0] as any).insertId) };
  } catch (error) {
    console.error("[DB] Error reporting content:", error);
    return { success: false };
  }
}

// Get user's chat threads list
export async function getUserChatThreadsList(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Get all threads where user is participant
    const threads = await db.select({
      id: chatThreads.id,
      user1Id: chatThreads.user1Id,
      user2Id: chatThreads.user2Id,
      lastMessageAt: chatThreads.lastMessageAt,
      createdAt: chatThreads.createdAt,
    })
    .from(chatThreads)
    .where(
      or(
        eq(chatThreads.user1Id, userId),
        eq(chatThreads.user2Id, userId)
      )
    )
    .orderBy(desc(chatThreads.lastMessageAt));
    
    // Get other user info and last message for each thread
    const threadsWithDetails = await Promise.all(threads.map(async (thread) => {
      const otherUserId = thread.user1Id === userId ? thread.user2Id : thread.user1Id;
      
      // Get other user info
      const otherUser = await db.select({
        id: users.id,
        name: users.name,
        photoUrl: users.photoUrl,
      })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);
      
      // Get last message
      const lastMessage = await db.select({
        id: chatMessages.id,
        content: chatMessages.content,
        senderId: chatMessages.senderId,
        createdAt: chatMessages.createdAt,
        isRead: chatMessages.isRead,
      })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, thread.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
      
      // Count unread messages
      const unreadCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.threadId, thread.id),
            ne(chatMessages.senderId, userId),
            eq(chatMessages.isRead, false)
          )
        );
      
      return {
        id: thread.id,
        otherUser: otherUser[0] || { id: otherUserId, name: 'Usuário', photoUrl: null },
        lastMessage: lastMessage[0] || null,
        unreadCount: Number(unreadCount[0]?.count || 0),
        lastMessageAt: thread.lastMessageAt,
      };
    }));
    
    return threadsWithDetails;
  } catch (error) {
    console.error("[DB] Error getting chat threads list:", error);
    return [];
  }
}

// Send message with safety checks
export async function sendChatMessageSafe(
  threadId: number,
  senderId: number,
  content: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };
  
  try {
    // Get thread to verify sender is participant
    const thread = await db.select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .limit(1);
    
    if (thread.length === 0) {
      return { success: false, error: "Thread not found" };
    }
    
    const t = thread[0];
    if (t.user1Id !== senderId && t.user2Id !== senderId) {
      return { success: false, error: "Not authorized to send messages in this thread" };
    }
    
    const otherUserId = t.user1Id === senderId ? t.user2Id : t.user1Id;
    
    // Check if blocked
    const isBlocked = await checkIfBlocked(senderId, otherUserId);
    if (isBlocked) {
      return { success: false, error: "Cannot send message to this user" };
    }
    
    // Check mutual follow still exists
    const isMutual = await checkMutualFollow(senderId, otherUserId);
    if (!isMutual) {
      return { success: false, error: "Chat only available between mutual followers" };
    }
    
    // Basic content moderation (can be expanded)
    const sanitizedContent = content.trim().substring(0, 2000); // Limit message length
    if (sanitizedContent.length === 0) {
      return { success: false, error: "Message cannot be empty" };
    }
    
    // Insert message
    const result = await db.insert(chatMessages).values({
      threadId,
      senderId,
      content: sanitizedContent,
      isRead: false,
    });
    
    // Update thread's lastMessageAt
    await db.update(chatThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(chatThreads.id, threadId));
    
    return { success: true, messageId: Number(result[0].insertId) };
  } catch (error) {
    console.error("[DB] Error sending message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

// Mark messages as read
export async function markMessagesAsRead(threadId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.threadId, threadId),
          ne(chatMessages.senderId, userId),
          eq(chatMessages.isRead, false)
        )
      );
  } catch (error) {
    console.error("[DB] Error marking messages as read:", error);
  }
}

// Get blocked users list
export async function getBlockedUsers(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const blocked = await db.execute(
      sql`SELECT b.blockedId, b.reason, b.createdAt, u.name, u.photoUrl 
          FROM user_blocks b 
          JOIN users u ON b.blockedId = u.id 
          WHERE b.blockerId = ${userId}
          ORDER BY b.createdAt DESC`
    );
    return (blocked[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting blocked users:", error);
    return [];
  }
}

// ==================== PARTE 1: CHAT ADVANCED FUNCTIONS ====================

// Delete thread for user (soft delete)
export async function deleteThreadForUser(threadId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`INSERT INTO chat_thread_deletions (threadId, userId, deletedAt) 
          VALUES (${threadId}, ${userId}, NOW())
          ON DUPLICATE KEY UPDATE deletedAt = NOW()`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error deleting thread for user:", error);
    return false;
  }
}

// Delete thread completely (hard delete) - removes all messages and the thread
export async function deleteThreadCompletely(threadId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // 1. Delete all reactions from messages in this thread
    await db.execute(
      sql`DELETE FROM chat_message_reactions 
          WHERE messageId IN (SELECT id FROM chat_messages WHERE threadId = ${threadId})`
    );
    
    // 2. Delete all messages in this thread
    await db.execute(
      sql`DELETE FROM chat_messages WHERE threadId = ${threadId}`
    );
    
    // 3. Delete thread deletion records
    await db.execute(
      sql`DELETE FROM chat_thread_deletions WHERE threadId = ${threadId}`
    );
    
    // 4. Delete the thread itself
    await db.execute(
      sql`DELETE FROM chat_threads WHERE id = ${threadId}`
    );
    
    console.log(`[DB] Thread ${threadId} completely deleted`);
    return true;
  } catch (error) {
    console.error("[DB] Error deleting thread completely:", error);
    return false;
  }
}

// Get user chat threads filtered (excluding deleted)
export async function getUserChatThreadsFiltered(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const threads = await db.execute(
      sql`SELECT ct.*, 
          CASE WHEN ct.participant1Id = ${userId} THEN ct.participant2Id ELSE ct.participant1Id END as otherUserId,
          u.name as otherUserName, u.photoUrl as otherUserPhoto,
          (SELECT content FROM chat_messages WHERE threadId = ct.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
          (SELECT COUNT(*) FROM chat_messages WHERE threadId = ct.id AND senderId != ${userId} AND isRead = false) as unreadCount
          FROM chat_threads ct
          JOIN users u ON u.id = CASE WHEN ct.participant1Id = ${userId} THEN ct.participant2Id ELSE ct.participant1Id END
          WHERE (ct.participant1Id = ${userId} OR ct.participant2Id = ${userId})
          AND ct.id NOT IN (SELECT threadId FROM chat_thread_deletions WHERE userId = ${userId})
          ORDER BY ct.lastMessageAt DESC`
    );
    return (threads[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting filtered chat threads:", error);
    return [];
  }
}

// Add reaction to message
export async function addMessageReaction(messageId: number, userId: number, emoji: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`INSERT INTO chat_message_reactions (messageId, userId, emoji, createdAt) 
          VALUES (${messageId}, ${userId}, ${emoji}, NOW())
          ON DUPLICATE KEY UPDATE emoji = ${emoji}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error adding message reaction:", error);
    return false;
  }
}

// Remove reaction from message
export async function removeMessageReaction(messageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`DELETE FROM chat_message_reactions WHERE messageId = ${messageId} AND userId = ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error removing message reaction:", error);
    return false;
  }
}

// Delete message (soft delete)
export async function deleteChatMessage(messageId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // First delete any reactions on this message
    await db.execute(
      sql`DELETE FROM chat_message_reactions WHERE messageId = ${messageId}`
    );
    
    // Then delete the message itself (hard delete)
    const result = await db.execute(
      sql`DELETE FROM chat_messages WHERE id = ${messageId} AND senderId = ${userId}`
    );
    
    console.log(`[DB] Message ${messageId} deleted by user ${userId}`);
    return (result[0] as any).affectedRows > 0;
  } catch (error) {
    console.error("[DB] Error deleting message:", error);
    return false;
  }
}

// Send chat message with reply
export async function sendChatMessageWithReply(
  threadId: number, 
  senderId: number, 
  content: string, 
  replyToMessageId?: number
): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.execute(
      sql`INSERT INTO chat_messages (threadId, senderId, content, replyToMessageId, createdAt) 
          VALUES (${threadId}, ${senderId}, ${content}, ${replyToMessageId || null}, NOW())`
    );
    
    await db.execute(sql`UPDATE chat_threads SET lastMessageAt = NOW() WHERE id = ${threadId}`);
    await db.execute(sql`DELETE FROM chat_thread_deletions WHERE threadId = ${threadId}`);
    
    const messageId = (result[0] as any).insertId;
    return { id: messageId, threadId, senderId, content, replyToMessageId };
  } catch (error) {
    console.error("[DB] Error sending message with reply:", error);
    return null;
  }
}

// Get chat messages with reactions and reply info
export async function getChatMessagesWithDetails(threadId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const messages = await db.execute(
      sql`SELECT m.*, 
          u.name as senderName, u.photoUrl as senderPhoto,
          rm.content as replyToContent, ru.name as replyToSenderName,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('userId', r.userId, 'emoji', r.emoji)) 
           FROM chat_message_reactions r WHERE r.messageId = m.id) as reactions
          FROM chat_messages m
          JOIN users u ON m.senderId = u.id
          LEFT JOIN chat_messages rm ON m.replyToMessageId = rm.id
          LEFT JOIN users ru ON rm.senderId = ru.id
          WHERE m.threadId = ${threadId}
          ORDER BY m.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}`
    );
    return (messages[0] as any[]).reverse();
  } catch (error) {
    console.error("[DB] Error getting messages with details:", error);
    return [];
  }
}

// ==================== PARTE 2: FEED LIKES FUNCTIONS ====================

// Get post likes with user info
export async function getPostLikes(postId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const likes = await db.execute(
      sql`SELECT pl.*, u.id as oderId, u.name, u.username, u.photoUrl,
          (SELECT COUNT(*) > 0 FROM user_follows WHERE followerId = pl.userId AND followingId = u.id) as isFollowing
          FROM post_likes pl
          JOIN users u ON pl.userId = u.id
          WHERE pl.postId = ${postId}
          ORDER BY pl.createdAt DESC
          LIMIT ${limit} OFFSET ${offset}`
    );
    return (likes[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting post likes:", error);
    return [];
  }
}

// Get recent likers for a post (for "liked by X and Y others")
export async function getRecentLikers(postId: number, limit: number = 2): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const likers = await db.execute(
      sql`SELECT u.id, u.name, u.photoUrl
          FROM post_likes pl
          JOIN users u ON pl.userId = u.id
          WHERE pl.postId = ${postId}
          ORDER BY pl.createdAt DESC
          LIMIT ${limit}`
    );
    return (likers[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting recent likers:", error);
    return [];
  }
}

// ==================== PARTE 2: SEARCH ATHLETES TYPEAHEAD ====================

// Search athletes with typeahead (prioritize friends/followed)
export async function searchAthletesTypeahead(
  userId: number, 
  query: string, 
  limit: number = 20
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const searchQuery = `%${query}%`;
    const athletes = await db.execute(
      sql`SELECT u.id, u.name, u.username, u.photoUrl, u.isPrivate,
          (SELECT status FROM user_follows WHERE followerId = ${userId} AND followingId = u.id) as followStatus,
          (SELECT COUNT(*) > 0 FROM user_follows f1 
           JOIN user_follows f2 ON f1.followingId = f2.followerId 
           WHERE f1.followerId = ${userId} AND f2.followingId = ${userId} AND f1.followingId = u.id) as isFriend,
          CASE 
            WHEN (SELECT COUNT(*) > 0 FROM user_follows WHERE followerId = ${userId} AND followingId = u.id AND status = 'accepted') THEN 0
            ELSE 1
          END as sortOrder
          FROM users u
          WHERE u.id != ${userId}
          AND (u.name LIKE ${searchQuery} OR u.username LIKE ${searchQuery})
          ORDER BY sortOrder ASC, u.name ASC
          LIMIT ${limit}`
    );
    return (athletes[0] as any[]);
  } catch (error) {
    console.error("[DB] Error searching athletes:", error);
    return [];
  }
}

// ==================== PARTE 3: FOLLOW WITH APPROVAL ====================

// Send follow request
export async function sendFollowRequest(followerId: number, followingId: number): Promise<{ success: boolean; status: string }> {
  const db = await getDb();
  if (!db) return { success: false, status: 'error' };
  
  try {
    // Check if target user is private
    const targetUser = await db.select({ isPrivate: users.isPrivate }).from(users).where(eq(users.id, followingId)).limit(1);
    const isPrivate = targetUser[0]?.isPrivate || false;
    
    const status = isPrivate ? 'pending' : 'accepted';
    
    await db.execute(
      sql`INSERT INTO user_follows (followerId, followingId, status, createdAt) 
          VALUES (${followerId}, ${followingId}, ${status}, NOW())
          ON DUPLICATE KEY UPDATE status = ${status}`
    );
    
    // Create notification
    const notifType = isPrivate ? 'follow_request' : 'new_follower';
    await db.execute(
      sql`INSERT INTO follow_notifications (userId, fromUserId, type, createdAt) 
          VALUES (${followingId}, ${followerId}, ${notifType}, NOW())`
    );
    
    return { success: true, status };
  } catch (error) {
    console.error("[DB] Error sending follow request:", error);
    return { success: false, status: 'error' };
  }
}

// Cancel follow request
export async function cancelFollowRequest(followerId: number, followingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`DELETE FROM user_follows WHERE followerId = ${followerId} AND followingId = ${followingId} AND status = 'pending'`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error canceling follow request:", error);
    return false;
  }
}

// Accept follow request
export async function acceptFollowRequest(userId: number, followerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`UPDATE user_follows SET status = 'accepted' WHERE followerId = ${followerId} AND followingId = ${userId} AND status = 'pending'`
    );
    
    // Create notification for requester
    await db.execute(
      sql`INSERT INTO follow_notifications (userId, fromUserId, type, createdAt) 
          VALUES (${followerId}, ${userId}, 'follow_accepted', NOW())`
    );
    
    return true;
  } catch (error) {
    console.error("[DB] Error accepting follow request:", error);
    return false;
  }
}

// Decline follow request
export async function declineFollowRequest(userId: number, followerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`UPDATE user_follows SET status = 'rejected' WHERE followerId = ${followerId} AND followingId = ${userId} AND status = 'pending'`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error declining follow request:", error);
    return false;
  }
}

// Unfollow user

// Get follow requests inbox
export async function getFollowRequestsInbox(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const requests = await db.execute(
      sql`SELECT uf.*, u.id as requesterId, u.name, u.username, u.photoUrl
          FROM user_follows uf
          JOIN users u ON uf.followerId = u.id
          WHERE uf.followingId = ${userId} AND uf.status = 'pending'
          ORDER BY uf.createdAt DESC`
    );
    return (requests[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting follow requests:", error);
    return [];
  }
}

// Get follow status between two users
export async function getFollowStatus(followerId: number, followingId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.execute(
      sql`SELECT status FROM user_follows WHERE followerId = ${followerId} AND followingId = ${followingId}`
    );
    const rows = result[0] as any[];
    return rows.length > 0 ? rows[0].status : null;
  } catch (error) {
    console.error("[DB] Error getting follow status:", error);
    return null;
  }
}

// Get follow notifications
export async function getFollowNotifications(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const notifications = await db.execute(
      sql`SELECT fn.*, u.name, u.username, u.photoUrl
          FROM follow_notifications fn
          JOIN users u ON fn.fromUserId = u.id
          WHERE fn.userId = ${userId}
          ORDER BY fn.createdAt DESC
          LIMIT 50`
    );
    return (notifications[0] as any[]);
  } catch (error) {
    console.error("[DB] Error getting follow notifications:", error);
    return [];
  }
}

// Mark follow notifications as read
export async function markFollowNotificationsRead(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`UPDATE follow_notifications SET isRead = true WHERE userId = ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error marking notifications as read:", error);
    return false;
  }
}



// ==================== SOCIAL NOTIFICATIONS FUNCTIONS ====================

// Create a social notification
export async function createSocialNotification(
  userId: number,
  fromUserId: number,
  type: 'new_follower' | 'follow_request' | 'follow_accepted' | 'like' | 'comment' | 'mention' | 'new_post' | 'share' | 'message' | 'event_registration' | 'event_cancel',
  options?: {
    postId?: number;
    commentId?: number;
    eventId?: number;
    message?: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Don't notify yourself
  if (userId === fromUserId) return true;
  
  try {
    await db.execute(
      sql`INSERT INTO social_notifications (userId, fromUserId, type, postId, commentId, eventId, message, createdAt) 
          VALUES (${userId}, ${fromUserId}, ${type}, ${options?.postId || null}, ${options?.commentId || null}, ${options?.eventId || null}, ${options?.message || null}, NOW())`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error creating social notification:", error);
    return false;
  }
}

// Get social notifications for a user
export async function getSocialNotifications(userId: number, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT 
            sn.*,
            u.name as fromUserName,
            u.photoUrl as fromUserPhoto,
            u.username as fromUserUsername,
            p.content as postContent,
            p.imageUrl as postMedia
          FROM social_notifications sn
          LEFT JOIN users u ON sn.fromUserId = u.id
          LEFT JOIN posts p ON sn.postId = p.id
          WHERE sn.userId = ${userId}
          ORDER BY sn.createdAt DESC
          LIMIT ${limit}`
    );
    return (result as any[])[0] || [];
  } catch (error) {
    console.error("[DB] Error getting social notifications:", error);
    return [];
  }
}

// Mark social notification as read
export async function markSocialNotificationRead(notificationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`UPDATE social_notifications SET isRead = true WHERE id = ${notificationId} AND userId = ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error marking notification as read:", error);
    return false;
  }
}

// Mark all social notifications as read
export async function markAllSocialNotificationsRead(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      sql`UPDATE social_notifications SET isRead = true WHERE userId = ${userId}`
    );
    return true;
  } catch (error) {
    console.error("[DB] Error marking all notifications as read:", error);
    return false;
  }
}

// Get unread social notifications count
export async function getUnreadSocialNotificationsCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM social_notifications WHERE userId = ${userId} AND isRead = false`
    );
    return (result as any[])[0]?.[0]?.count || 0;
  } catch (error) {
    console.error("[DB] Error getting unread count:", error);
    return 0;
  }
}

// Notify followers about new post
export async function notifyFollowersOfNewPost(userId: number, postId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    // Get all followers
    const followers = await db.execute(
      sql`SELECT followerId FROM user_follows WHERE followingId = ${userId} AND status = 'accepted'`
    );
    
    const followerIds = (followers as any[])[0] || [];
    
    // Create notification for each follower
    for (const follower of followerIds) {
      await createSocialNotification(follower.followerId, userId, 'new_post', { postId });
    }
  } catch (error) {
    console.error("[DB] Error notifying followers of new post:", error);
  }
}

// Delete old notifications (cleanup)
export async function deleteOldSocialNotifications(daysOld: number = 30): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    await db.execute(
      sql`DELETE FROM social_notifications WHERE createdAt < DATE_SUB(NOW(), INTERVAL ${daysOld} DAY)`
    );
  } catch (error) {
    console.error("[DB] Error deleting old notifications:", error);
  }
}


// ==================== MODERATION ====================

/**
 * Buscar posts pendentes de moderação
 */
export async function getPendingModerationPosts(limit: number = 20, offset: number = 0): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        photoUrl: users.photoUrl,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.moderationStatus, 'pending'))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
    
    return result.map(r => ({
      ...r.post,
      author: r.author,
    }));
  } catch (error) {
    console.error("[DB] Error getting pending moderation posts:", error);
    return [];
  }
}

/**
 * Moderar um post (aprovar, rejeitar, quarentena)
 */
export async function moderatePost(
  postId: number, 
  status: 'approved' | 'rejected' | 'quarantine',
  moderatorId: number | null,
  note?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const result = await db.update(posts)
      .set({
        moderationStatus: status,
        moderationNote: note || null,
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
      })
      .where(eq(posts.id, postId));
    
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error("[DB] Error moderating post:", error);
    return false;
  }
}

/**
 * Obter estatísticas de moderação
 */
export async function getModerationStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  quarantine: number;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, quarantine: 0, total: 0 };
  
  try {
    const result = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN moderationStatus = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN moderationStatus = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN moderationStatus = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN moderationStatus = 'quarantine' THEN 1 ELSE 0 END) as quarantine,
        COUNT(*) as total
      FROM posts
    `);
    
    const row = (result as any[])[0]?.[0] || {};
    return {
      pending: Number(row.pending) || 0,
      approved: Number(row.approved) || 0,
      rejected: Number(row.rejected) || 0,
      quarantine: Number(row.quarantine) || 0,
      total: Number(row.total) || 0,
    };
  } catch (error) {
    console.error("[DB] Error getting moderation stats:", error);
    return { pending: 0, approved: 0, rejected: 0, quarantine: 0, total: 0 };
  }
}

/**
 * Gerar tokens de moderação para e-mail
 */
export function generateModerationTokens(postId: number): {
  viewToken: string;
  approveToken: string;
  rejectToken: string;
} {
  const crypto = require('crypto');
  const secret = process.env.JWT_SECRET || 'secret';
  
  const viewToken = crypto.createHash('sha256').update(`view-${postId}-${secret}`).digest('hex').substring(0, 16);
  const approveToken = crypto.createHash('sha256').update(`approve-${postId}-${secret}`).digest('hex').substring(0, 16);
  const rejectToken = crypto.createHash('sha256').update(`reject-${postId}-${secret}`).digest('hex').substring(0, 16);
  
  return { viewToken, approveToken, rejectToken };
}

/**
 * Enviar e-mail de moderação para admin
 */
export async function sendModerationEmail(postId: number, authorName: string, content: string, imageUrl?: string): Promise<boolean> {
  try {
    const { sendEmail } = require('./_core/email');
    const tokens = generateModerationTokens(postId);
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const approveUrl = `${baseUrl}/api/moderate?action=approve&postId=${postId}&token=${tokens.approveToken}`;
    const rejectUrl = `${baseUrl}/api/moderate?action=reject&postId=${postId}&token=${tokens.rejectToken}`;
    const viewUrl = `${baseUrl}/api/moderate?action=view&postId=${postId}&token=${tokens.viewToken}`;
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@souesporte.com';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">🔔 Novo Post Aguardando Moderação</h2>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Autor:</strong> ${authorName}</p>
          <p><strong>Conteúdo:</strong></p>
          <p style="background: white; padding: 10px; border-radius: 4px;">${content || '(sem texto)'}</p>
          ${imageUrl ? `<img src="${imageUrl}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" />` : ''}
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${approveUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 5px;">
            ✅ Aprovar
          </a>
          <a href="${rejectUrl}" style="display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 5px;">
            ❌ Rejeitar
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Post ID: ${postId}<br>
          <a href="${viewUrl}">Ver detalhes completos</a>
        </p>
      </div>
    `;
    
    await sendEmail({
      to: adminEmail,
      subject: `[Moderação] Novo post de ${authorName}`,
      html,
    });
    
    console.log(`[Moderation] Email sent for post ${postId}`);
    return true;
  } catch (error) {
    console.error("[Moderation] Error sending email:", error);
    return false;
  }
}


// ==================== GROUPS V12.10 - EXPANDED ====================

// Get group membership
export async function getGroupMembership(groupId: number, userId: number): Promise<GroupMember | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(groupMembers)
    .where(and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.status, 'active')
    ))
    .limit(1);
  
  return result[0] || null;
}

// Get group members with user info
export async function getGroupMembers(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    member: groupMembers,
    user: {
      id: users.id,
      name: users.name,
      username: users.username,
      photoUrl: users.photoUrl,
    },
  })
  .from(groupMembers)
  .innerJoin(users, eq(groupMembers.userId, users.id))
  .where(eq(groupMembers.groupId, groupId))
  .orderBy(
    sql`FIELD(${groupMembers.role}, 'owner', 'admin', 'moderator', 'member')`,
    groupMembers.joinedAt
  );
  
  return result.map(r => ({
    ...r.member,
    user: r.user,
  }));
}

// Update group member
export async function updateGroupMember(
  groupId: number, 
  userId: number, 
  data: { role?: string; canCreateTraining?: boolean }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(groupMembers)
    .set(data as any)
    .where(and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId)
    ));
}

// Remove group member
export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(groupMembers)
    .where(and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId)
    ));
  
  await db.update(groups)
    .set({ memberCount: sql`GREATEST(${groups.memberCount} - 1, 0)` })
    .where(eq(groups.id, groupId));
}

// ==================== GROUP INVITES ====================

export async function createGroupInvite(invite: {
  groupId: number;
  invitedUserId: number;
  invitedBy: number;
  message?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(groupInvites).values({
    ...invite,
    status: 'pending',
  } as any);
  
  return result[0].insertId;
}

export async function getGroupPendingInvites(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    invite: groupInvites,
    user: {
      id: users.id,
      name: users.name,
      username: users.username,
      photoUrl: users.photoUrl,
    },
  })
  .from(groupInvites)
  .innerJoin(users, eq(groupInvites.invitedUserId, users.id))
  .where(and(
    eq(groupInvites.groupId, groupId),
    eq(groupInvites.status, 'pending')
  ));
  
  return result;
}

export async function cancelGroupInvite(inviteId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(groupInvites)
    .set({ 
      status: 'cancelled',
      respondedAt: new Date(),
    } as any)
    .where(eq(groupInvites.id, inviteId));
}

export async function searchUsersNotInGroup(groupId: number, query: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get current members
  const members = await db.select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  
  const memberIds = members.map(m => m.userId);
  
  // Search users not in group
  const result = await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    photoUrl: users.photoUrl,
  })
  .from(users)
  .where(and(
    or(
      like(users.name, `%${query}%`),
      like(users.username, `%${query}%`)
    ),
    memberIds.length > 0 ? notInArray(users.id, memberIds) : sql`1=1`
  ))
  .limit(20);
  
  return result;
}

// ==================== GROUP RANKING ====================

export async function getGroupRanking(groupId: number, modality: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    ranking: groupRankings,
    user: {
      id: users.id,
      name: users.name,
      username: users.username,
      photoUrl: users.photoUrl,
    },
  })
  .from(groupRankings)
  .innerJoin(users, eq(groupRankings.userId, users.id))
  .where(and(
    eq(groupRankings.groupId, groupId),
    eq(groupRankings.modality, modality as any)
  ))
  .orderBy(desc(groupRankings.points))
  .limit(100);
  
  return result.map((r, index) => ({
    ...r.ranking,
    user: r.user,
    position: index + 1,
  }));
}

async function updateGroupRanking(
  groupId: number, 
  userId: number, 
  modality: string,
  data: Partial<InsertGroupRanking>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Check if ranking exists
  const existing = await db.select()
    .from(groupRankings)
    .where(and(
      eq(groupRankings.groupId, groupId),
      eq(groupRankings.userId, userId),
      eq(groupRankings.modality, modality as any)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(groupRankings)
      .set(data as any)
      .where(eq(groupRankings.id, existing[0].id));
  } else {
    await db.insert(groupRankings).values({
      groupId,
      userId,
      modality: modality as any,
      ...data,
    } as any);
  }
}

// ==================== FUNCTIONAL TRAININGS ====================

export async function createFunctionalTraining(training: any): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(functionalTrainings).values(training);
  return result[0].insertId;
}

export async function getFunctionalTrainings(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(functionalTrainings)
    .where(eq(functionalTrainings.groupId, groupId))
    .orderBy(desc(functionalTrainings.scheduledAt));
}

export async function joinFunctionalTraining(
  trainingId: number, 
  userId: number, 
  response: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Upsert participant
  const existing = await db.select()
    .from(functionalTrainingParticipants)
    .where(and(
      eq(functionalTrainingParticipants.trainingId, trainingId),
      eq(functionalTrainingParticipants.userId, userId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(functionalTrainingParticipants)
      .set({ response: response as any })
      .where(eq(functionalTrainingParticipants.id, existing[0].id));
  } else {
    await db.insert(functionalTrainingParticipants).values({
      trainingId,
      userId,
      response: response as any,
    } as any);
  }
  
  // Update going count
  const goingCount = await db.select({ count: sql<number>`count(*)` })
    .from(functionalTrainingParticipants)
    .where(and(
      eq(functionalTrainingParticipants.trainingId, trainingId),
      eq(functionalTrainingParticipants.response, 'going')
    ));
  
  await db.update(functionalTrainings)
    .set({ goingCount: goingCount[0]?.count || 0 })
    .where(eq(functionalTrainings.id, trainingId));
}

export async function completeFunctionalTraining(
  trainingId: number, 
  userId: number, 
  data: { totalTime?: number; notes?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(functionalTrainingParticipants)
    .set({
      completed: true,
      completedAt: new Date(),
      ...data,
    } as any)
    .where(and(
      eq(functionalTrainingParticipants.trainingId, trainingId),
      eq(functionalTrainingParticipants.userId, userId)
    ));
  
  // Update completed count
  const completedCount = await db.select({ count: sql<number>`count(*)` })
    .from(functionalTrainingParticipants)
    .where(and(
      eq(functionalTrainingParticipants.trainingId, trainingId),
      eq(functionalTrainingParticipants.completed, true)
    ));
  
  await db.update(functionalTrainings)
    .set({ completedCount: completedCount[0]?.count || 0 })
    .where(eq(functionalTrainings.id, trainingId));
  
  // Update ranking
  const training = await db.select().from(functionalTrainings).where(eq(functionalTrainings.id, trainingId)).limit(1);
  if (training[0]) {
    await updateGroupRanking(training[0].groupId, userId, 'funcional', {
      totalParticipations: sql`${groupRankings.totalParticipations} + 1` as any,
      totalTime: sql`${groupRankings.totalTime} + ${data.totalTime || 0}` as any,
      points: sql`${groupRankings.points} + 10` as any,
    });
  }
}

// ==================== HIKES ====================

export async function createHike(hike: any): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hikes).values(hike);
  return result[0].insertId;
}

export async function getHikes(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(hikes)
    .where(eq(hikes.groupId, groupId))
    .orderBy(desc(hikes.scheduledAt));
}

export async function joinHike(hikeId: number, userId: number, response: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select()
    .from(hikeParticipants)
    .where(and(
      eq(hikeParticipants.hikeId, hikeId),
      eq(hikeParticipants.userId, userId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(hikeParticipants)
      .set({ response: response as any })
      .where(eq(hikeParticipants.id, existing[0].id));
  } else {
    await db.insert(hikeParticipants).values({
      hikeId,
      userId,
      response: response as any,
    } as any);
  }
  
  const goingCount = await db.select({ count: sql<number>`count(*)` })
    .from(hikeParticipants)
    .where(and(
      eq(hikeParticipants.hikeId, hikeId),
      eq(hikeParticipants.response, 'going')
    ));
  
  await db.update(hikes)
    .set({ goingCount: goingCount[0]?.count || 0 })
    .where(eq(hikes.id, hikeId));
}

export async function completeHike(
  hikeId: number, 
  userId: number, 
  data: { distanceCompleted?: number; totalTime?: number; elevationGain?: number }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(hikeParticipants)
    .set({
      completed: true,
      completedAt: new Date(),
      ...data,
    } as any)
    .where(and(
      eq(hikeParticipants.hikeId, hikeId),
      eq(hikeParticipants.userId, userId)
    ));
  
  const completedCount = await db.select({ count: sql<number>`count(*)` })
    .from(hikeParticipants)
    .where(and(
      eq(hikeParticipants.hikeId, hikeId),
      eq(hikeParticipants.completed, true)
    ));
  
  await db.update(hikes)
    .set({ completedCount: completedCount[0]?.count || 0 })
    .where(eq(hikes.id, hikeId));
  
  // Update ranking
  const hike = await db.select().from(hikes).where(eq(hikes.id, hikeId)).limit(1);
  if (hike[0]) {
    await updateGroupRanking(hike[0].groupId, userId, 'caminhada_trail', {
      totalParticipations: sql`${groupRankings.totalParticipations} + 1` as any,
      totalDistance: sql`${groupRankings.totalDistance} + ${data.distanceCompleted || 0}` as any,
      totalElevation: sql`${groupRankings.totalElevation} + ${data.elevationGain || 0}` as any,
      points: sql`${groupRankings.points} + ${Math.round((data.distanceCompleted || 0) * 2)}` as any,
    });
  }
}

// ==================== YOGA SESSIONS ====================

export async function createYogaSession(session: any): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(yogaSessions).values(session);
  return result[0].insertId;
}

export async function getYogaSessions(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(yogaSessions)
    .where(eq(yogaSessions.groupId, groupId))
    .orderBy(desc(yogaSessions.scheduledAt));
}

export async function joinYogaSession(sessionId: number, userId: number, response: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select()
    .from(yogaSessionParticipants)
    .where(and(
      eq(yogaSessionParticipants.sessionId, sessionId),
      eq(yogaSessionParticipants.userId, userId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(yogaSessionParticipants)
      .set({ response: response as any })
      .where(eq(yogaSessionParticipants.id, existing[0].id));
  } else {
    await db.insert(yogaSessionParticipants).values({
      sessionId,
      userId,
      response: response as any,
    } as any);
  }
  
  const goingCount = await db.select({ count: sql<number>`count(*)` })
    .from(yogaSessionParticipants)
    .where(and(
      eq(yogaSessionParticipants.sessionId, sessionId),
      eq(yogaSessionParticipants.response, 'going')
    ));
  
  await db.update(yogaSessions)
    .set({ goingCount: goingCount[0]?.count || 0 })
    .where(eq(yogaSessions.id, sessionId));
}

export async function submitYogaFeedback(
  sessionId: number, 
  userId: number, 
  data: { rating: number; feedback?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(yogaSessionParticipants)
    .set({
      attended: true,
      attendedAt: new Date(),
      ...data,
    } as any)
    .where(and(
      eq(yogaSessionParticipants.sessionId, sessionId),
      eq(yogaSessionParticipants.userId, userId)
    ));
  
  // Update avg rating
  const ratings = await db.select({ avg: sql<number>`AVG(rating)` })
    .from(yogaSessionParticipants)
    .where(and(
      eq(yogaSessionParticipants.sessionId, sessionId),
      sql`rating IS NOT NULL`
    ));
  
  await db.update(yogaSessions)
    .set({ avgRating: ratings[0]?.avg?.toString() || null })
    .where(eq(yogaSessions.id, sessionId));
  
  // Update ranking
  const session = await db.select().from(yogaSessions).where(eq(yogaSessions.id, sessionId)).limit(1);
  if (session[0]) {
    await updateGroupRanking(session[0].groupId, userId, 'yoga', {
      totalParticipations: sql`${groupRankings.totalParticipations} + 1` as any,
      points: sql`${groupRankings.points} + 5` as any,
    });
  }
}

// ==================== FIGHT TRAININGS ====================

export async function createFightTraining(training: any): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(fightTrainings).values(training);
  return result[0].insertId;
}

export async function getFightTrainings(groupId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(fightTrainings)
    .where(eq(fightTrainings.groupId, groupId))
    .orderBy(desc(fightTrainings.scheduledAt));
}

export async function joinFightTraining(trainingId: number, userId: number, response: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select()
    .from(fightTrainingParticipants)
    .where(and(
      eq(fightTrainingParticipants.trainingId, trainingId),
      eq(fightTrainingParticipants.userId, userId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(fightTrainingParticipants)
      .set({ response: response as any })
      .where(eq(fightTrainingParticipants.id, existing[0].id));
  } else {
    await db.insert(fightTrainingParticipants).values({
      trainingId,
      userId,
      response: response as any,
    } as any);
  }
  
  const goingCount = await db.select({ count: sql<number>`count(*)` })
    .from(fightTrainingParticipants)
    .where(and(
      eq(fightTrainingParticipants.trainingId, trainingId),
      eq(fightTrainingParticipants.response, 'going')
    ));
  
  await db.update(fightTrainings)
    .set({ goingCount: goingCount[0]?.count || 0 })
    .where(eq(fightTrainings.id, trainingId));
}

export async function completeFightTraining(
  trainingId: number, 
  userId: number, 
  data: { wins?: number; losses?: number; draws?: number; technicalNotes?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(fightTrainingParticipants)
    .set({
      completed: true,
      completedAt: new Date(),
      ...data,
    } as any)
    .where(and(
      eq(fightTrainingParticipants.trainingId, trainingId),
      eq(fightTrainingParticipants.userId, userId)
    ));
  
  const completedCount = await db.select({ count: sql<number>`count(*)` })
    .from(fightTrainingParticipants)
    .where(and(
      eq(fightTrainingParticipants.trainingId, trainingId),
      eq(fightTrainingParticipants.completed, true)
    ));
  
  await db.update(fightTrainings)
    .set({ completedCount: completedCount[0]?.count || 0 })
    .where(eq(fightTrainings.id, trainingId));
  
  // Update ranking
  const training = await db.select().from(fightTrainings).where(eq(fightTrainings.id, trainingId)).limit(1);
  if (training[0]) {
    const points = 10 + (data.wins || 0) * 5;
    await updateGroupRanking(training[0].groupId, userId, 'lutas', {
      totalParticipations: sql`${groupRankings.totalParticipations} + 1` as any,
      totalWins: sql`${groupRankings.totalWins} + ${data.wins || 0}` as any,
      totalLosses: sql`${groupRankings.totalLosses} + ${data.losses || 0}` as any,
      points: sql`${groupRankings.points} + ${points}` as any,
    });
  }
}

// ==================== GROUP CHAT ====================

export async function getGroupMessages(groupId: number, limit: number, before?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select({
    message: groupMessages,
    sender: {
      id: users.id,
      name: users.name,
      username: users.username,
      photoUrl: users.photoUrl,
    },
  })
  .from(groupMessages)
  .innerJoin(users, eq(groupMessages.senderId, users.id))
  .where(and(
    eq(groupMessages.groupId, groupId),
    eq(groupMessages.status, 'active'),
    before ? sql`${groupMessages.id} < ${before}` : sql`1=1`
  ))
  .orderBy(desc(groupMessages.createdAt))
  .limit(limit);
  
  const result = await query;
  
  return result.map(r => ({
    ...r.message,
    sender: r.sender,
  })).reverse();
}

export async function sendGroupMessage(message: {
  groupId: number;
  senderId: number;
  content: string;
  imageUrl?: string;
  replyToId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(groupMessages).values(message as any);
  return result[0].insertId;
}

export async function getGroupMessage(messageId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(groupMessages)
    .where(eq(groupMessages.id, messageId))
    .limit(1);
  
  return result[0] || null;
}

export async function deleteGroupMessage(messageId: number, deletedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(groupMessages)
    .set({
      status: 'deleted',
      deletedBy,
      deletedAt: new Date(),
    } as any)
    .where(eq(groupMessages.id, messageId));
}

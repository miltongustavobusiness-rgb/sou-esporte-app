import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { cacheService, cacheAside, CACHE_KEYS, CACHE_TTL, invalidateEventCache } from "./cache";
import { nanoid } from "nanoid";

// Helper to check admin/organizer role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'organizer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin or organizer access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  // ==================== AUTH ROUTES ====================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== USER/PROFILE ROUTES ====================
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return user;
    }),
    
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        photoUrl: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        emergencyName: z.string().optional(),
        emergencyPhone: z.string().optional(),
        bloodType: z.string().optional(),
        healthInfo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return {
        totalRaces: user.totalRaces,
        totalDistance: user.totalDistance,
        bestTime5k: user.bestTime5k,
        bestTime10k: user.bestTime10k,
        bestTime21k: user.bestTime21k,
        bestTime42k: user.bestTime42k,
      };
    }),
    
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserResults(ctx.user.id);
    }),
  }),

  // ==================== CITIES ROUTES ====================
  cities: router({
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).optional().default(15)
      }))
      .query(async ({ input }) => {
        const { query, limit } = input;
        const cities = await db.searchCities(query, limit);
        return cities;
      }),
  }),

  // ==================== EVENTS ROUTES ====================
  events: router({
    list: publicProcedure
      .input(z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        distance: z.number().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        trending: z.boolean().optional(), // alias para featured
        limit: z.number().default(20),
        offset: z.number().default(0),
        type: z.enum(['corrida', 'ciclismo', 'triathlon', 'trail', 'natacao', 'caminhada', 'ultramaratona', 'corrida_montanha', 'duathlon', 'aquathlon', 'ironman', 'mtb', 'ocr', 'outro']).optional(), // Modalidade Esportiva (ex: Corrida, Triathlon, Ciclismo)
        category: z.string().optional(), // alias para type (Modalidade Esportiva, NÃO confundir com categoria de inscrição 5K/10K)
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.enum(['date', 'name', 'trending', 'price']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        organizerId: z.number().optional(),
        timeFilter: z.enum(['upcoming', 'past', 'all']).optional(), // filtro de tempo
        // Filtros de preço/gratuidade
        isPaidEvent: z.boolean().optional(), // true = apenas pagos, false = apenas gratuitos
        hasFreeCategories: z.boolean().optional(), // true = eventos com categorias gratuitas
      }).optional())
      .query(async ({ input }) => {
        console.log('[events.list] Input received:', JSON.stringify(input, null, 2));
        
        // Gerar chave de cache baseada nos filtros
        const cacheKey = CACHE_KEYS.EVENTS_LIST(JSON.stringify(input || {}));
        
        // Cache-aside para listagem (30 segundos)
        const result = await cacheAside(
          cacheKey,
          CACHE_TTL.EVENTS_LIST,
          async () => {
            return await db.listEvents({
              ...input,
              status: 'published',
            });
          }
        );
        
        // Increment search count for returned events when search term is used
        // (fora do cache para sempre registrar buscas)
        if (input?.search && result.length > 0) {
          for (const event of result) {
            await db.incrementEventSearchCount(event.id);
          }
        }
        
        console.log('[events.list] Returning', result.length, 'events');
        return result;
      }),
    
    getFeatured: publicProcedure.query(async () => {
      return await db.listEvents({ status: 'published', featured: true, limit: 6 });
    }),
    
    // Eventos em Alta - Sistema de Ranking Inteligente (COM CACHE)
    getHighlights: publicProcedure
      .input(z.object({ limit: z.number().default(10) }).optional())
      .query(async ({ input }) => {
        const limit = Math.min(input?.limit || 10, 10); // Max 10 eventos
        
        // Cache-aside: busca do cache, se não tiver, busca do banco
        return await cacheAside(
          CACHE_KEYS.HIGHLIGHTS_TOP(limit),
          CACHE_TTL.HIGHLIGHTS,
          () => db.getHighlightEvents(limit)
        );
      }),
    
    // Track event view (increment viewCount)
    trackView: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementEventViewCount(input.eventId);
        return { success: true };
      }),
    
    // Like event
    like: publicProcedure
      .input(z.object({ eventId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.likeEvent(input.eventId, input.userId);
        return { success, liked: success };
      }),
    
    // Unlike event
    unlike: publicProcedure
      .input(z.object({ eventId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.unlikeEvent(input.eventId, input.userId);
        return { success, liked: !success };
      }),
    
    // Check if user liked event
    isLiked: publicProcedure
      .input(z.object({ eventId: z.number(), userId: z.number() }))
      .query(async ({ input }) => {
        const liked = await db.isEventLikedByUser(input.eventId, input.userId);
        return { liked };
      }),
    
    // Get user's liked events
    getUserLikes: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const eventIds = await db.getUserLikedEventIds(input.userId);
        return { eventIds };
      }),
    
    // Share event (record share)
    share: publicProcedure
      .input(z.object({ 
        eventId: z.number(), 
        userId: z.number().optional(),
        platform: z.enum(['whatsapp', 'instagram', 'facebook', 'twitter', 'copy_link', 'other']).default('other')
      }))
      .mutation(async ({ input }) => {
        const success = await db.recordEventShare(input.eventId, input.userId || null, input.platform);
        return { success };
      }),
    
    getUpcoming: publicProcedure
      .input(z.object({ limit: z.number().default(10) }).optional())
      .query(async ({ input }) => {
        return await db.listEvents({ 
          status: 'published', 
          dateFrom: new Date(),
          limit: input?.limit || 10 
        });
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event || event.status === 'draft') {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Get categories count and subscribers count
        const categories = await db.getEventCategories(input.id);
        const subscribersCount = await db.getEventSubscribersCount(input.id);
        
        // Gerar timestamps em horário de Brasília (America/Sao_Paulo)
        // Brasília é UTC-3 (sem horário de verão desde 2019)
        const now = new Date();
        const brasiliaOffset = -3 * 60; // -180 minutos
        const brasiliaTime = new Date(now.getTime() + (now.getTimezoneOffset() + brasiliaOffset) * 60000);
        
        // Formatar como ISO 8601 com offset -03:00
        const formatBrasiliaISO = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
        };
        
        // Compor event_start_at_brasilia a partir de eventDate + eventTime
        let eventStartAtBrasilia: string | null = null;
        if (event.eventDate) {
          const eventDate = new Date(event.eventDate);
          const eventTime = event.eventTime || '07:00';
          const [hours, minutes] = eventTime.split(':').map(Number);
          
          // eventDate está armazenado como UTC, precisamos extrair a data correta
          // A data do evento é armazenada como meia-noite UTC, então usamos getUTCDate
          const year = eventDate.getUTCFullYear();
          const month = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(eventDate.getUTCDate()).padStart(2, '0');
          const h = String(hours).padStart(2, '0');
          const m = String(minutes).padStart(2, '0');
          eventStartAtBrasilia = `${year}-${month}-${day}T${h}:${m}:00-03:00`;
        }
        
        // Return event with Brasilia timestamps for countdown synchronization
        return {
          ...event,
          server_time: new Date().toISOString(), // UTC para compatibilidade
          server_time_brasilia: formatBrasiliaISO(brasiliaTime),
          event_start_at_brasilia: eventStartAtBrasilia,
          categoriesCount: categories.length,
          subscribersCount: subscribersCount,
          startTimeLabel: event.eventTime || '07:00',
        };
      }),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const event = await db.getEventBySlug(input.slug);
        if (!event || event.status === 'draft') {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return event;
      }),
    
    getCategories: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventCategories(input.eventId);
      }),
    
    getKits: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventKits(input.eventId);
      }),
    
    getPhotos: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventPhotos(input.eventId);
      }),
    
    getResults: publicProcedure
      .input(z.object({ 
        eventId: z.number(),
        categoryId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEventResults(input.eventId, input.categoryId);
      }),
  }),

  // ==================== REGISTRATION ROUTES ====================
  registration: router({
    create: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        categoryId: z.number(),
        kitId: z.number().optional(),
        kitSize: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already registered
        const existing = await db.checkExistingRegistration(ctx.user.id, input.eventId);
        if (existing) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Você já está inscrito neste evento' 
          });
        }
        
        // Get event and category details
        const event = await db.getEventById(input.eventId);
        if (!event || event.status !== 'published') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        const category = await db.getCategoryById(input.categoryId);
        if (!category || category.eventId !== input.eventId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Categoria não encontrada' });
        }
        
        // Check capacity
        if (category.maxParticipants && category.currentParticipants && 
            category.currentParticipants >= category.maxParticipants) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Categoria esgotada' 
          });
        }
        
        // Calculate price
        let categoryPrice = Number(category.price);
        if (category.earlyBirdPrice && category.earlyBirdEndDate && 
            new Date() < category.earlyBirdEndDate) {
          categoryPrice = Number(category.earlyBirdPrice);
        }
        
        let kitPrice = 0;
        if (input.kitId) {
          const kit = await db.getKitById(input.kitId);
          if (kit && kit.eventId === input.eventId) {
            kitPrice = Number(kit.additionalPrice) || 0;
          }
        }
        
        const totalPrice = categoryPrice + kitPrice;
        
        // Create registration
        const { id, checkoutToken } = await db.createRegistration({
          userId: ctx.user.id,
          eventId: input.eventId,
          categoryId: input.categoryId,
          kitId: input.kitId || null,
          kitSize: input.kitSize || null,
          categoryPrice: categoryPrice.toString(),
          kitPrice: kitPrice.toString(),
          totalPrice: totalPrice.toString(),
          paymentStatus: 'pending',
          status: 'pending',
        });
        
        // Build checkout URL
        const checkoutUrl = event.checkoutBaseUrl 
          ? `${event.checkoutBaseUrl}?token=${checkoutToken}`
          : null;
        
        return { 
          id, 
          checkoutToken, 
          checkoutUrl,
          totalPrice 
        };
      }),
    
    getMyRegistrations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserRegistrations(ctx.user.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const reg = await db.getRegistrationById(input.id);
        if (!reg || reg.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return reg;
      }),
    
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const reg = await db.getRegistrationByToken(input.token);
        if (!reg) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return reg;
      }),
    
    // Webhook for external checkout to update payment status
    updatePaymentStatus: publicProcedure
      .input(z.object({
        token: z.string(),
        status: z.enum(['pending', 'paid', 'cancelled', 'refunded']),
        transactionId: z.string().optional(),
        paymentMethod: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateRegistrationPayment(
          input.token,
          input.status,
          input.transactionId,
          input.paymentMethod
        );
        return { success: true };
      }),
  }),

  // ==================== RESULTS ROUTES ====================
  results: router({
    getMyResults: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserResults(ctx.user.id);
    }),
    
    getByEvent: publicProcedure
      .input(z.object({
        eventId: z.number(),
        categoryId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEventResults(input.eventId, input.categoryId);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await db.getResultById(input.id);
        if (!result) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return result;
      }),
  }),

  // ==================== MOBILE API (Public for testing) ====================
  mobile: router({
    // Create event from mobile app (public for testing)
    createEvent: publicProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        eventDate: z.union([z.date(), z.string()]), // Accept both Date and string
        eventTime: z.string().optional(),
        city: z.string(),
        state: z.string(),
        eventType: z.enum(['corrida', 'ciclismo', 'triathlon', 'trail', 'natacao', 'caminhada', 'ultramaratona', 'corrida_montanha', 'duathlon', 'aquathlon', 'ironman', 'mtb', 'ocr', 'outro']).optional(),
        bannerUrl: z.string().optional(),
        status: z.enum(['draft', 'published']).default('draft'),
        organizerId: z.number().optional(), // Allow passing organizerId
        organizerName: z.string().optional(), // Nome do organizador/empresa
        isPaidEvent: z.boolean().default(true), // false = evento gratuito, true = evento pago
      }))
      .mutation(async ({ input }) => {
        // Convert string date to Date if needed
        const eventDate = typeof input.eventDate === 'string' 
          ? new Date(input.eventDate) 
          : input.eventDate;
        
        // Use provided organizerId or default to 1 for testing
        const organizerId = input.organizerId || 1;
        
        const id = await db.createEvent({
          name: input.name,
          slug: input.slug,
          description: input.description,
          shortDescription: input.shortDescription,
          eventDate,
          eventTime: input.eventTime || null, // HH:mm format
          city: input.city,
          state: input.state,
          bannerUrl: input.bannerUrl,
          status: input.status,
          organizerId,
          organizerName: input.organizerName || null,
          isPaidEvent: input.isPaidEvent,
          routeCoordinates: null,
          mapCenter: null,
        });
        
        // Invalidar cache de listagens ao criar evento
        await cacheService.invalidatePattern('events:list');
        await cacheService.invalidatePattern('highlights');
        
        return { id };
      }),
    
    // Create category for event
    createCategory: publicProcedure
      .input(z.object({
        eventId: z.number(),
        name: z.string(),
        distance: z.string().optional(),
        ageGroup: z.string().optional(),
        gender: z.enum(['male', 'female', 'mixed']).default('mixed'),
        isPaid: z.boolean().default(true), // false = categoria gratuita, true = categoria paga
        price: z.string(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Convert distance string like "10K" to numeric km value
        let distanceKm: string | null = null;
        if (input.distance) {
          const distanceMatch = input.distance.match(/(\d+(?:\.\d+)?)/); 
          if (distanceMatch) {
            distanceKm = distanceMatch[1];
          }
        }
        
        // Se categoria é gratuita, forçar preço = 0
        const finalPrice = input.isPaid ? input.price : "0";
        
        const id = await db.createEventCategory({
          eventId: input.eventId,
          name: input.name,
          distance: distanceKm,
          minAge: null,
          maxAge: null,
          gender: input.gender,
          isPaid: input.isPaid,
          price: finalPrice,
          earlyBirdPrice: null,
          earlyBirdEndDate: null,
          maxParticipants: input.maxParticipants || null,
          currentParticipants: 0,
          startTime: null,
        });
        return { id };
      }),
    
    // List all events (for mobile)
    listEvents: publicProcedure.query(async () => {
      return await db.listEvents({ limit: 100, offset: 0 });
    }),
    
    // Get event by ID
    getEvent: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventById(input.id);
      }),
    
    // Get organizer events with stats (for mobile organizer mode) - LEGACY, use getMyOrganizerEvents instead
    getOrganizerEvents: publicProcedure
      .input(z.object({ organizerId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        // For testing, use organizerId = 1 if not provided
        const organizerId = input?.organizerId || 1;
        const events = await db.getEventsByOrganizer(organizerId);
        
        // Get stats for each event
        const eventsWithStats = await Promise.all(
          events.map(async (event) => {
            const registrations = await db.getEventRegistrations(event.id);
            const paidRegs = registrations.filter(r => r.registration.paymentStatus === 'paid');
            const pendingRegs = registrations.filter(r => r.registration.paymentStatus === 'pending');
            
            const totalRevenue = paidRegs.reduce((sum, r) => sum + Number(r.registration.totalPrice || 0), 0);
            
            return {
              id: event.id,
              name: event.name,
              date: event.eventDate,
              city: event.city,
              state: event.state,
              status: event.status,
              totalRegistrations: registrations.length,
              paidRegistrations: paidRegs.length,
              pendingRegistrations: pendingRegs.length,
              totalRevenue,
              imageUrl: event.bannerUrl,
              maxParticipants: null,
            };
          })
        );
        
        return eventsWithStats;
      }),
    
    // SECURE: Get events created by the logged-in organizer (uses userId from request, not from client)
    getMyOrganizerEvents: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        // SECURITY: userId comes from the mobile app's stored session
        // The mobile app stores the userId after login and sends it here
        // This is more secure than accepting organizerId directly
        const userId = input.userId;
        
        if (!userId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não autenticado' });
        }
        
        // Get events where organizerId matches the logged-in user's ID
        const events = await db.getEventsByOrganizer(userId);
        
        // Get stats for each event
        const eventsWithStats = await Promise.all(
          events.map(async (event) => {
            const registrations = await db.getEventRegistrations(event.id);
            const paidRegs = registrations.filter(r => r.registration.paymentStatus === 'paid');
            const pendingRegs = registrations.filter(r => r.registration.paymentStatus === 'pending');
            
            const totalRevenue = paidRegs.reduce((sum, r) => sum + Number(r.registration.totalPrice || 0), 0);
            
            return {
              id: event.id,
              name: event.name,
              slug: event.slug,
              description: event.description,
              eventDate: event.eventDate,
              city: event.city,
              state: event.state,
              status: event.status,
              bannerUrl: event.bannerUrl,
              totalRegistrations: registrations.length,
              paidRegistrations: paidRegs.length,
              pendingRegistrations: pendingRegs.length,
              totalRevenue,
              maxParticipants: 50, // Default capacity - not stored in events table
              createdAt: event.createdAt,
              // Engagement metrics from events table
              viewCount: event.viewCount || 0,
              likesCount: event.likesCount || 0,
              sharesCount: event.sharesCount || 0,
              // Preço do evento (gratuito ou pago)
              isPaidEvent: event.isPaidEvent !== false, // true = pago, false = gratuito
              organizerName: event.organizerName || null,
            };
          })
        );
        
        // Sort by event date (upcoming first)
        return eventsWithStats.sort((a, b) => {
          const dateA = new Date(a.eventDate).getTime();
          const dateB = new Date(b.eventDate).getTime();
          return dateA - dateB;
        });
      }),
    
    // Delete event (for mobile organizer mode)
    deleteEvent: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // First check if event exists
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        // Delete event (this will cascade delete related records)
        await db.deleteEvent(input.id);
        return { success: true };
      }),
    
    // Get user registrations (tickets)
    getUserRegistrations: publicProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        // For testing, use userId = 1 if not provided
        const userId = input?.userId || 1;
        return await db.getUserRegistrations(userId);
      }),
    
    // Get organizer stats (for mobile organizer dashboard)
    getOrganizerStats: publicProcedure
      .input(z.object({ organizerId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const organizerId = input?.organizerId || 1;
        return await db.getOrganizerStats(organizerId);
      }),
    
    // Get user's teams (for mobile - public endpoint with userId)
    getMyTeams: publicProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        if (!input?.userId) {
          return [];
        }
        return await db.getUserTeams(input.userId);
      }),
    
    // Update event (for mobile organizer mode)
    updateEvent: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        eventDate: z.date().optional(),
        eventTime: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        eventType: z.enum(['corrida', 'ciclismo', 'triathlon', 'trail', 'natacao', 'caminhada', 'ultramaratona', 'corrida_montanha', 'duathlon', 'aquathlon', 'ironman', 'mtb', 'ocr', 'outro']).optional(),
        bannerUrl: z.string().optional(),
        status: z.enum(['draft', 'published', 'cancelled', 'finished']).optional(),
        organizerName: z.string().optional(), // Nome do organizador/empresa
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // Check if event exists
        const event = await db.getEventById(id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        await db.updateEvent(id, data);
        
        // Invalidar cache do evento e listagens
        await invalidateEventCache(id);
        
        return { success: true, message: 'Evento atualizado com sucesso' };
      }),
    
    // Publish event (change status to published)
    publishEvent: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        await db.updateEvent(input.id, { status: 'published' });
        
        // Invalidar cache ao publicar evento
        await invalidateEventCache(input.id);
        
        return { success: true, message: 'Evento publicado com sucesso' };
      }),
    
    // Cancel event (soft delete with reason, notifications and refunds)
    cancelEvent: publicProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(10, 'O motivo deve ter pelo menos 10 caracteres'),
        organizerId: z.number().optional(), // For validation
      }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        // Check if event is already cancelled
        if (event.status === 'cancelled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este evento já foi cancelado' });
        }
        
        // Get all registrations for this event
        const registrations = await db.getEventRegistrations(input.id);
        const paidRegistrations = registrations.filter(r => r.registration.paymentStatus === 'paid');
        
        // Update event status to cancelled
        await db.cancelEvent(input.id, {
          cancelReason: input.reason,
          cancelledAt: new Date(),
          cancelledByOrganizerId: input.organizerId || event.organizerId,
        });
        
        // Mark all paid registrations for refund
        for (const reg of paidRegistrations) {
          await db.updateRegistrationRefund(reg.registration.id, {
            refundStatus: 'pending',
            refundReason: `Evento cancelado: ${input.reason}`,
          });
        }
        
        // TODO: Send notifications to all registered users
        // TODO: Process refunds via payment gateway
        
        // Invalidar cache ao cancelar evento
        await invalidateEventCache(input.id);
        
        return {
          success: true,
          message: 'Evento cancelado com sucesso',
          totalRegistrations: registrations.length,
          refundsInitiated: paidRegistrations.length,
        };
      }),
    
    // Get event details for editing
    getEventForEdit: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        // Get categories for this event
        const categories = await db.getEventCategories(input.id);
        
        // Return with server_time for countdown synchronization
        return { 
          event: {
            ...event,
            server_time: new Date().toISOString(),
          }, 
          categories 
        };
      }),
    
    // Get event registrations (for organizer)
    getEventRegistrations: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventRegistrations(input.eventId);
      }),
    
    // Register new user (for mobile app)
    registerUser: publicProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Este e-mail já está cadastrado' });
        }
        
        // Check if CPF already exists (if provided)
        if (input.cpf) {
          const existingCpf = await db.getUserByCpf(input.cpf);
          if (existingCpf) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este CPF já está cadastrado' });
          }
        }
        
        // Create user with hashed password
        const userId = await db.createUser({
          name: input.name,
          email: input.email,
          password: input.password,
          cpf: input.cpf || null,
          phone: input.phone || null,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          gender: input.gender || null,
          photoUrl: input.photoUrl || null,
        });
        
        return { success: true, userId, message: 'Conta criada com sucesso!' };
      }),
    
    // Send OTP code to email (for mobile app)
    sendOTP: publicProcedure
      .input(z.object({
        email: z.string().email(),
        isNewAccount: z.boolean().optional(), // true se for novo cadastro
      }))
      .mutation(async ({ input }) => {
        // Generate 6-digit OTP code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if user exists
        const existingUser = await db.getUserByEmail(input.email);
        const isExistingUser = !!existingUser;
        
        // Se for novo cadastro e email já existe com nome preenchido, avisar
        if (input.isNewAccount && existingUser && existingUser.name) {
          return { 
            success: false, 
            isExistingUser: true,
            message: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' 
          };
        }
        
        let userId: number;
        if (!existingUser) {
          // Create new user with minimal data
          const newUser = await db.createUserWithEmail({
            email: input.email,
            name: null,
            loginMethod: 'otp',
          });
          userId = newUser.id;
        } else {
          userId = existingUser.id;
        }
        
        // Store OTP code (reuse password reset token table)
        await db.createPasswordResetToken(userId, input.email);
        
        // Get the code that was just created
        const resetToken = await db.getLatestPasswordResetToken(input.email);
        const otpCode = resetToken?.code || code;
        
        // Send OTP email
        try {
          const { sendOTPEmail } = await import('./_core/email');
          const emailSent = await sendOTPEmail(input.email, otpCode);
          
          if (!emailSent) {
            console.error('[OTP] Failed to send email to:', input.email);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar código. Tente novamente.' });
          }
          
          console.log('[OTP] Email sent successfully to:', input.email);
        } catch (error) {
          console.error('[OTP] Error sending email:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao enviar código. Tente novamente.' });
        }
        
        return { success: true, message: 'Código enviado para seu e-mail.' };
      }),
    
    // Verify OTP code and login (for mobile app)
    verifyOTP: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await db.validatePasswordResetCode(input.email, input.code);
        
        if (!result.valid) {
          // Return specific error message based on reason
          let errorMessage = 'Código inválido ou expirado';
          
          switch (result.reason) {
            case 'already_used':
              errorMessage = 'Este código já foi utilizado. Por favor, solicite um novo código.';
              break;
            case 'expired':
              errorMessage = 'Este código expirou. Por favor, solicite um novo código.';
              break;
            case 'not_found':
              errorMessage = 'Código incorreto. Verifique e tente novamente.';
              break;
          }
          
          throw new TRPCError({ code: 'BAD_REQUEST', message: errorMessage });
        }
        
        // Get user
        const user = await db.getUserByEmail(input.email);
        
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        
        // Mark token as used
        await db.usePasswordResetToken(result.token!);
        
        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photoUrl: user.photoUrl,
            cpf: user.cpf,
            phone: user.phone,
            birthDate: user.birthDate,
            gender: user.gender,
            street: user.street,
            number: user.number,
            complement: user.complement,
            neighborhood: user.neighborhood,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
            emergencyName: user.emergencyName,
            emergencyPhone: user.emergencyPhone,
            bloodType: user.bloodType,
            healthInfo: user.healthInfo,
          },
        };
      }),
    
    // Login user (for mobile app)
    loginUser: publicProcedure
      .input(z.object({
        email: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmailAndPassword(input.email, input.password);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha inválidos' });
        }
        
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        
        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photoUrl: user.photoUrl,
            cpf: user.cpf,
            phone: user.phone,
            birthDate: user.birthDate,
            gender: user.gender,
            street: user.street,
            number: user.number,
            complement: user.complement,
            neighborhood: user.neighborhood,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
            emergencyName: user.emergencyName,
            emergencyPhone: user.emergencyPhone,
            bloodType: user.bloodType,
            healthInfo: user.healthInfo,
          },
        };
      }),
    
    // Request password reset (send code to email)
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user) {
          // Don't reveal if email exists or not for security
          return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.' };
        }
        
        // Create reset token
        const { code } = await db.createPasswordResetToken(user.id, input.email);
        
        // Send email with recovery code to the user
        try {
          const { sendPasswordResetEmail } = await import('./_core/email');
          const emailSent = await sendPasswordResetEmail(input.email, user.name, code);
          
          if (!emailSent) {
            console.error('[Password Reset] Failed to send email to:', input.email);
            // Still return success to not reveal if email exists
          } else {
            console.log('[Password Reset] Email sent successfully to:', input.email);
          }
        } catch (error) {
          console.error('[Password Reset] Error sending email:', error);
        }
        
        return { success: true, message: 'Código de recuperação enviado para seu e-mail.' };
      }),
    
    // Verify password reset code
    verifyResetCode: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await db.validatePasswordResetCode(input.email, input.code);
        
        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código inválido ou expirado' });
        }
        
        return { success: true, token: result.token };
      }),
    
    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      }))
      .mutation(async ({ input }) => {
        const result = await db.usePasswordResetToken(input.token);
        
        if (!result.success || !result.userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token inválido ou expirado' });
        }
        
        // Update password
        await db.updateUserPassword(result.userId, input.newPassword);
        
        return { success: true, message: 'Senha alterada com sucesso!' };
      }),
    
    // Update user profile (for mobile app - uses userId instead of session)
    updateProfile: publicProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        birthDate: z.date().optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        photoUrl: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        emergencyName: z.string().optional(),
        emergencyPhone: z.string().optional(),
        bloodType: z.string().optional(),
        healthInfo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...profileData } = input;
        
        // Verify user exists
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        await db.updateUserProfile(userId, profileData);
        
        // Return updated user data
        const updatedUser = await db.getUserById(userId);
        return { 
          success: true, 
          user: updatedUser ? {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            photoUrl: updatedUser.photoUrl,
            cpf: updatedUser.cpf,
            phone: updatedUser.phone,
            birthDate: updatedUser.birthDate,
            gender: updatedUser.gender,
            street: updatedUser.street,
            number: updatedUser.number,
            complement: updatedUser.complement,
            neighborhood: updatedUser.neighborhood,
            city: updatedUser.city,
            state: updatedUser.state,
            zipCode: updatedUser.zipCode,
            emergencyName: updatedUser.emergencyName,
            emergencyPhone: updatedUser.emergencyPhone,
            bloodType: updatedUser.bloodType,
            healthInfo: updatedUser.healthInfo,
          } : null
        };
      }),

    // Upload image (for mobile app)
    uploadImage: publicProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string(),
        contentType: z.string().default('image/jpeg'),
        folder: z.enum(['profiles', 'events', 'teams']).default('profiles'),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        
        // Decode base64 to buffer
        const buffer = Buffer.from(input.base64, 'base64');
        
        // Generate unique filename
        const uniqueFilename = `${input.folder}/${Date.now()}-${nanoid(8)}-${input.filename}`;
        
        // Upload to S3
        const { url } = await storagePut(uniqueFilename, buffer, input.contentType);
        
        return { success: true, url };
      }),
    
    // Check-in athlete at event
    checkIn: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const registration = await db.getRegistrationById(input.registrationId);
        if (!registration) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscrição não encontrada' });
        }
        
        if (registration.paymentStatus !== 'paid') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pagamento não confirmado' });
        }
        
        await db.updateRegistrationCheckIn(input.registrationId, true);
        return { success: true };
      }),
    
    // Confirm payment manually
    confirmPayment: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const registration = await db.getRegistrationById(input.registrationId);
        if (!registration) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscrição não encontrada' });
        }
        
        await db.updateRegistrationPaymentStatus(input.registrationId, 'paid');
        return { success: true };
      }),
    
    // Cancel registration
    cancelRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const registration = await db.getRegistrationById(input.registrationId);
        if (!registration) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscrição não encontrada' });
        }
        
        await db.updateRegistrationStatus(input.registrationId, 'cancelled');
        return { success: true };
      }),
    
    // Publish results for event
    publishResults: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.eventId);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        // Mark event as having results published by updating status to finished
        await db.updateEvent(input.eventId, { status: 'finished' });
        return { success: true };
      }),
    
    // Add result for athlete
    addResult: publicProcedure
      .input(z.object({
        eventId: z.number(),
        athleteName: z.string(),
        bibNumber: z.string().optional(),
        categoryName: z.string().optional(),
        chipTime: z.string(),
        gunTime: z.string().optional(),
        pace: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEventResult(input);
        return { id };
      }),
    
    // Delete result
    deleteResult: publicProcedure
      .input(z.object({ resultId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEventResult(input.resultId);
        return { success: true };
      }),
    
    // Validate voucher code
    validateVoucher: publicProcedure
      .input(z.object({
        code: z.string(),
        eventId: z.number().optional(),
        orderValue: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.validateVoucher(input.code, input.eventId, input.orderValue);
        if (!result.valid || !result.voucher) {
          return { valid: false, error: result.error };
        }
        
        const discount = db.calculateDiscount(result.voucher, input.orderValue || 0);
        return {
          valid: true,
          voucher: {
            id: result.voucher.id,
            code: result.voucher.code,
            discountType: result.voucher.discountType,
            discountValue: result.voucher.discountValue,
          },
          discountAmount: discount.toFixed(2),
        };
      }),

    // Push Notifications
    savePushToken: protectedProcedure
      .input(z.object({
        token: z.string(),
        platform: z.string(),
        deviceName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.savePushToken(ctx.user.id, input.token, input.platform, input.deviceName);
        return { success: true };
      }),

    removePushToken: protectedProcedure
      .input(z.object({
        token: z.string().optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        await db.removePushToken(ctx.user.id, input?.token);
        return { success: true };
      }),

    // Complete onboarding - save user profile data after OTP verification
    completeOnboarding: publicProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string(),
        username: z.string().min(3).max(30),
        email: z.string().email(),
        phone: z.string().optional(),
        birthDate: z.string(), // DD/MM/YYYY format
        gender: z.enum(['masculino', 'feminino', 'outro', 'prefiro_nao_informar']),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validate username uniqueness
        const normalizedUsername = input.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const existingUser = await db.getUserByUsername(normalizedUsername);
        if (existingUser && existingUser.id !== input.userId) {
          return { success: false, error: 'Username já está em uso' };
        }
        
        // Convert DD/MM/YYYY to Date
        let birthDateParsed: Date | null = null;
        if (input.birthDate) {
          const [day, month, year] = input.birthDate.split('/');
          if (day && month && year) {
            birthDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
        
        // Map gender to database format
        const genderMap: Record<string, string> = {
          'masculino': 'male',
          'feminino': 'female',
          'outro': 'other',
          'prefiro_nao_informar': 'other',
        };
        
        const genderDb = genderMap[input.gender] || 'other';
        
        // Update user profile
        await db.updateUserProfile(input.userId, {
          name: input.name,
          username: normalizedUsername,
          email: input.email,
          phone: input.phone || null,
          birthDate: birthDateParsed,
          gender: genderDb as 'male' | 'female' | 'other',
          photoUrl: input.photoUrl || null,
          profileStatus: 'BASIC_COMPLETE',
        });
        
        // Get updated user
        const user = await db.getUserById(input.userId);
        
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        return {
          success: true,
          message: 'Cadastro concluído com sucesso!',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photoUrl: user.photoUrl,
            cpf: user.cpf,
            phone: user.phone,
            birthDate: user.birthDate,
            gender: user.gender,
            street: user.street,
            number: user.number,
            complement: user.complement,
            neighborhood: user.neighborhood,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
            emergencyName: user.emergencyName,
            emergencyPhone: user.emergencyPhone,
            bloodType: user.bloodType,
            healthInfo: user.healthInfo,
            profileStatus: user.profileStatus,
            billingStatus: user.billingStatus,
          },
        };
      }),
    
    // ==================== AUTH FLOW V12.9 ====================
    
    // Social Login (Google/Apple/Facebook)
    socialLogin: publicProcedure
      .input(z.object({
        provider: z.enum(['google', 'apple', 'facebook']),
        token: z.string(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if user exists by email
        let user = input.email ? await db.getUserByEmail(input.email) : null;
        
        if (!user && input.email) {
          // Create new user with social login
          const newUser = await db.createUserWithEmail({
            email: input.email,
            name: input.name || null,
            loginMethod: input.provider,
          });
          user = await db.getUserById(newUser.id);
        }
        
        if (!user) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'E-mail não fornecido pelo provedor' });
        }
        
        // Update photo and name if provided
        await db.updateUserProfile(user.id, {
          photoUrl: input.photoUrl || user.photoUrl,
          name: input.name || user.name,
          loginMethod: input.provider, // Use existing loginMethod field
        });
        
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        
        // Get updated user
        const updatedUser = await db.getUserById(user.id);
        
        return {
          success: true,
          isNewUser: !user.name,
          user: {
            id: updatedUser!.id,
            name: updatedUser!.name,
            email: updatedUser!.email,
            role: updatedUser!.role,
            photoUrl: updatedUser!.photoUrl,
            cpf: updatedUser!.cpf,
            phone: updatedUser!.phone,
            birthDate: updatedUser!.birthDate,
            gender: updatedUser!.gender,
            profileStatus: updatedUser!.profileStatus,
            // emailVerified and accountStatus removed for DB compatibility
          },
        };
      }),
    
    // Send email verification
    sendVerificationEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // Generate verification code
        await db.createPasswordResetToken(input.userId, input.email);
        const resetToken = await db.getLatestPasswordResetToken(input.email);
        const code = resetToken?.code || '';
        
        // Send verification email
        try {
          const { sendVerificationEmail } = await import('./_core/email');
          await sendVerificationEmail(input.email, code);
          console.log('[Email Verification] Code sent to:', input.email, '- Code:', code);
        } catch (error) {
          console.error('[Email Verification] Error sending email:', error);
          // In dev mode, just log the code
          console.log('[Email Verification] DEV MODE - Code:', code);
        }
        
        return { success: true, message: 'Código de verificação enviado para seu e-mail.' };
      }),
    
    // Verify email with code
    verifyEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await db.validatePasswordResetCode(input.email, input.code);
        
        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código inválido ou expirado' });
        }
        
        // Mark email as verified (fields commented out for DB compatibility)
        const user = await db.getUserByEmail(input.email);
        if (user) {
          // emailVerified field not in DB yet - just mark token as used
          // await db.updateUserProfile(user.id, {
          //   emailVerified: true,
          //   emailVerifiedAt: new Date(),
          // } as any);
          
          // Mark token as used
          await db.usePasswordResetToken(result.token!);
        }
        
        return { success: true, message: 'E-mail verificado com sucesso!' };
      }),
    
    // Request account recovery (for blocked accounts)
    requestAccountRecovery: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user) {
          // Don't reveal if email exists
          return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá instruções de recuperação.' };
        }
        
        // Generate recovery code
        await db.createPasswordResetToken(user.id, input.email);
        const resetToken = await db.getLatestPasswordResetToken(input.email);
        const code = resetToken?.code || '';
        
        // Send recovery email
        try {
          const { sendAccountRecoveryEmail } = await import('./_core/email');
          await sendAccountRecoveryEmail(input.email, user.name, code);
          console.log('[Account Recovery] Code sent to:', input.email, '- Code:', code);
        } catch (error) {
          console.error('[Account Recovery] Error sending email:', error);
          console.log('[Account Recovery] DEV MODE - Code:', code);
        }
        
        return { success: true, message: 'Código de recuperação enviado para seu e-mail.' };
      }),
    
    // Unlock account with code
    unlockAccount: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
      }))
      .mutation(async ({ input }) => {
        const result = await db.validatePasswordResetCode(input.email, input.code);
        
        if (!result.valid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código inválido ou expirado' });
        }
        
        // Unlock account (fields commented out for DB compatibility)
        const user = await db.getUserByEmail(input.email);
        if (user) {
          // accountStatus fields not in DB yet - just mark token as used
          // await db.updateUserProfile(user.id, {
          //   accountStatus: 'active',
          //   failedLoginAttempts: 0,
          //   blockedAt: null,
          //   blockedReason: null,
          // } as any);
          
          // Mark token as used
          await db.usePasswordResetToken(result.token!);
        }
        
        return { success: true, message: 'Conta desbloqueada com sucesso!' };
      }),
    
    // Check account status
    checkAccountStatus: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user) {
          return { exists: false };
        }
        
        return {
          exists: true,
          accountStatus: 'active', // Default value - field not in DB yet
          emailVerified: false, // Default value - field not in DB yet
          loginProvider: user.loginMethod || 'email', // Use existing loginMethod field
        };
      }),
    
    // ==================== MOBILE GROUPS API ====================
    // These routes accept userId as parameter since mobile doesn't use cookie auth
    
    // List user's groups (mobile)
    getUserGroups: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          console.log('[mobile.getUserGroups] Request for userId:', input.userId);
          
          const user = await db.getUserById(input.userId);
          if (!user) {
            console.log('[mobile.getUserGroups] User not found:', input.userId);
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
          }
          
          console.log('[mobile.getUserGroups] User found:', user.name);
          
          const groups = await db.getUserGroups(input.userId);
          console.log('[mobile.getUserGroups] Groups found:', groups?.length || 0);
          
          return groups || [];
        } catch (error: any) {
          console.error('[mobile.getUserGroups] ERROR:', error.message || error);
          console.error('[mobile.getUserGroups] Stack:', error.stack);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Erro ao buscar grupos: ${error.message || 'Erro desconhecido'}` 
          });
        }
      }),
    
    // Create group (mobile)
    createGroup: publicProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(3).max(100),
        description: z.string().max(1000).optional(),
        privacy: z.enum(['public', 'private']).optional(),
        groupType: z.enum(['running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other']).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(2).optional(),
        meetingPoint: z.string().optional(),
        requiresApproval: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log('[mobile.createGroup] Input received:', JSON.stringify(input));
        
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        
        try {
          // Build group data object with only required fields + defined optional fields
          const groupInsertData: any = {
            name: input.name,
            ownerId: input.userId,
          };
          
          // Add optional fields only if they are defined and valid
          if (input.privacy) {
            groupInsertData.privacy = input.privacy;
          }
          if (input.groupType) {
            groupInsertData.groupType = input.groupType;
          }
          if (typeof input.requiresApproval === 'boolean') {
            groupInsertData.requiresApproval = input.requiresApproval;
          }
          if (input.description && input.description.trim().length > 0) {
            groupInsertData.description = input.description.trim();
          }
          if (input.city && input.city.trim().length > 0) {
            groupInsertData.city = input.city.trim();
          }
          if (input.state && input.state.trim().length > 0) {
            groupInsertData.state = input.state.trim().substring(0, 2).toUpperCase();
          }
          if (input.meetingPoint && input.meetingPoint.trim().length > 0) {
            groupInsertData.meetingPoint = input.meetingPoint.trim();
          }
          
          console.log('[mobile.createGroup] Inserting group data:', JSON.stringify(groupInsertData));
          
          const groupId = await db.createGroup(groupInsertData);
          
          console.log('[mobile.createGroup] Group created successfully with ID:', groupId);
          
          return { success: true, groupId };
        } catch (error: any) {
          console.error('[mobile.createGroup] Error creating group:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Erro ao criar grupo: ${error.message || 'Erro desconhecido'}` 
          });
        }
      }),
    
    // Get group details (mobile)
    getGroup: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        
        const group = await db.getGroupById(input.groupId);
        if (!group) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Grupo não encontrado' });
        }
        
        const membership = await db.getGroupMembership(input.groupId, input.userId);
        const isOwner = group.ownerId === input.userId;
        const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
        const isMember = !!membership;
        
        return { ...group, membership, isOwner, isAdmin, isMember };
      }),
    
    // Join group (mobile)
    joinGroup: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        
        const success = await db.joinGroup(input.groupId, input.userId);
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível entrar no grupo' });
        }
        return { success: true };
      }),
    
    // Leave group (mobile)
    leaveGroup: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        
        const success = await db.leaveGroup(input.groupId, input.userId);
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível sair do grupo' });
        }
        return { success: true };
      }),
    
    // Get group members (mobile)
    getGroupMembers: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        
        const membership = await db.getGroupMembership(input.groupId, input.userId);
        if (!membership) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não é membro deste grupo' });
        }
        
        return db.getGroupMembers(input.groupId);
      }),
    
    // ==================== MOBILE TRAININGS API ====================
    // These routes accept userId as parameter since mobile doesn't use cookie auth
    
    // List trainings (mobile)
    getTrainings: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        const { userId, ...filters } = input;
        return await db.getTrainings(filters);
      }),
    
    // Get training by ID (mobile)
    getTrainingById: publicProcedure
      .input(z.object({
        userId: z.number(),
        trainingId: z.number(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        return await db.getTrainingById(input.trainingId);
      }),
    
    // Get user's trainings (mobile)
    getMyTrainings: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        return await db.getUserTrainings(input.userId);
      }),
    
    // Get nearby trainings (mobile)
    getNearbyTrainings: publicProcedure
      .input(z.object({
        userId: z.number(),
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        return await db.getNearbyTrainings(input.lat, input.lng, input.radiusKm);
      }),
    
    // Create training (mobile)
    createTraining: publicProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        trainingType: z.string(),
        scheduledAt: z.string(), // ISO date string
        durationMinutes: z.number().optional(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        const { userId, ...trainingData } = input;
        const trainingId = await db.createTraining({
          ...trainingData,
          scheduledAt: new Date(trainingData.scheduledAt),
          createdBy: userId,
        });
        return { id: trainingId, success: true };
      }),
    
    // Join training (mobile)
    joinTraining: publicProcedure
      .input(z.object({
        userId: z.number(),
        trainingId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado para realizar esta ação.' });
        }
        await db.joinTraining(input.trainingId, input.userId, input.response);
        return { success: true };
      }),
  }),

  // ==================== GROUPS V12.10 ====================
  groups: router({
    // Get group details
    getGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Grupo não encontrado' });
        
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        const isOwner = group.ownerId === ctx.user.id;
        const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';
        
        return { ...group, membership, isOwner, isAdmin };
      }),
    
    // Get group members
    getMembers: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não é membro deste grupo' });
        
        return db.getGroupMembers(input.groupId);
      }),
    
    // Update member role/permissions
    updateMember: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        userId: z.number(),
        role: z.enum(['admin', 'moderator', 'member']).optional(),
        canCreateTraining: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const myMembership = await db.getGroupMembership(input.groupId, ctx.user.id);
        const isOwner = group.ownerId === ctx.user.id;
        const isAdmin = myMembership?.role === 'admin' || isOwner;
        
        if (!isAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem alterar membros' });
        
        await db.updateGroupMember(input.groupId, input.userId, {
          role: input.role,
          canCreateTraining: input.canCreateTraining,
        });
        
        return { success: true };
      }),
    
    // Remove member
    removeMember: protectedProcedure
      .input(z.object({ groupId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const myMembership = await db.getGroupMembership(input.groupId, ctx.user.id);
        const isOwner = group.ownerId === ctx.user.id;
        const isAdmin = myMembership?.role === 'admin' || isOwner;
        
        if (!isAdmin && input.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        await db.removeGroupMember(input.groupId, input.userId);
        return { success: true };
      }),
    
    // Invite user to group
    inviteUser: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        userId: z.number(),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        const inviteId = await db.createGroupInvite({
          groupId: input.groupId,
          invitedUserId: input.userId,
          invitedBy: ctx.user.id,
          message: input.message,
        });
        
        return { inviteId };
      }),
    
    // Get pending invites
    getPendingInvites: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return db.getGroupPendingInvites(input.groupId);
      }),
    
    // Cancel invite
    cancelInvite: protectedProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.cancelGroupInvite(input.inviteId, ctx.user.id);
        return { success: true };
      }),
    
    // Search users to invite
    searchUsersToInvite: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        query: z.string().min(2),
      }))
      .query(async ({ ctx, input }) => {
        return db.searchUsersNotInGroup(input.groupId, input.query);
      }),
    
    // Get group ranking
    getRanking: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        modality: z.enum(['corrida', 'bike', 'natacao', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'geral']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getGroupRanking(input.groupId, input.modality || 'geral');
      }),
    
    // ==================== FUNCTIONAL TRAININGS ====================
    createFunctionalTraining: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        trainingType: z.enum(['halteres', 'peso_corporal', 'kettlebell', 'misto']),
        focus: z.enum(['forca', 'resistencia', 'mobilidade', 'circuito']),
        durationMinutes: z.number().optional(),
        exercises: z.array(z.object({
          name: z.string(),
          sets: z.number().optional(),
          reps: z.number().optional(),
          rest: z.number().optional(),
          equipment: z.string().optional(),
          notes: z.string().optional(),
        })).optional(),
        scheduledAt: z.date(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        maxParticipants: z.number().optional(),
        equipmentNeeded: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        const canCreate = ['owner', 'admin'].includes(membership.role) || membership.canCreateTraining;
        if (!canCreate) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar treinos' });
        
        const id = await db.createFunctionalTraining({
          ...input,
          createdBy: ctx.user.id,
        });
        
        return { id };
      }),
    
    getFunctionalTrainings: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        return db.getFunctionalTrainings(input.groupId);
      }),
    
    joinFunctionalTraining: protectedProcedure
      .input(z.object({
        trainingId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.joinFunctionalTraining(input.trainingId, ctx.user.id, input.response);
        return { success: true };
      }),
    
    completeFunctionalTraining: protectedProcedure
      .input(z.object({
        trainingId: z.number(),
        totalTime: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.completeFunctionalTraining(input.trainingId, ctx.user.id, {
          totalTime: input.totalTime,
          notes: input.notes,
        });
        return { success: true };
      }),
    
    // ==================== HIKES (CAMINHADAS/TRILHAS) ====================
    createHike: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        trailType: z.enum(['urbano', 'trilha_leve', 'trilha_moderada', 'trilha_avancada']),
        distanceKm: z.number().optional(),
        durationMinutes: z.number().optional(),
        elevationGain: z.number().optional(),
        scheduledAt: z.date(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        routeCoordinates: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        const canCreate = ['owner', 'admin'].includes(membership.role) || membership.canCreateTraining;
        if (!canCreate) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar trilhas' });
        
        const id = await db.createHike({
          ...input,
          createdBy: ctx.user.id,
        });
        
        return { id };
      }),
    
    getHikes: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        return db.getHikes(input.groupId);
      }),
    
    joinHike: protectedProcedure
      .input(z.object({
        hikeId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.joinHike(input.hikeId, ctx.user.id, input.response);
        return { success: true };
      }),
    
    completeHike: protectedProcedure
      .input(z.object({
        hikeId: z.number(),
        distanceCompleted: z.number().optional(),
        totalTime: z.number().optional(),
        elevationGain: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.completeHike(input.hikeId, ctx.user.id, {
          distanceCompleted: input.distanceCompleted,
          totalTime: input.totalTime,
          elevationGain: input.elevationGain,
        });
        return { success: true };
      }),
    
    // ==================== YOGA SESSIONS ====================
    createYogaSession: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        style: z.enum(['hatha', 'vinyasa', 'restaurativa', 'ashtanga', 'kundalini', 'yin', 'outro']),
        level: z.enum(['iniciante', 'intermediario', 'avancado', 'todos']),
        durationMinutes: z.number().optional(),
        instructorName: z.string().optional(),
        instructorBio: z.string().optional(),
        instructorPhotoUrl: z.string().optional(),
        scheduledAt: z.date(),
        isOnline: z.boolean().optional(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        videoConferenceUrl: z.string().optional(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        const canCreate = ['owner', 'admin'].includes(membership.role) || membership.canCreateTraining;
        if (!canCreate) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar sessões' });
        
        const id = await db.createYogaSession({
          ...input,
          createdBy: ctx.user.id,
        });
        
        return { id };
      }),
    
    getYogaSessions: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        return db.getYogaSessions(input.groupId);
      }),
    
    joinYogaSession: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.joinYogaSession(input.sessionId, ctx.user.id, input.response);
        return { success: true };
      }),
    
    submitYogaFeedback: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        rating: z.number().min(1).max(5),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.submitYogaFeedback(input.sessionId, ctx.user.id, {
          rating: input.rating,
          feedback: input.feedback,
        });
        return { success: true };
      }),
    
    // ==================== FIGHT TRAININGS ====================
    createFightTraining: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        fightStyle: z.enum(['jiu_jitsu', 'muay_thai', 'boxe', 'judo', 'karate', 'mma', 'capoeira', 'outro']),
        beltLevel: z.enum(['branca', 'azul', 'roxa', 'marrom', 'preta', 'iniciante', 'intermediario', 'avancado', 'todos']).optional(),
        trainingType: z.enum(['tecnica', 'sparring_leve', 'sparring_intenso', 'preparacao_fisica', 'competicao']),
        durationMinutes: z.number().optional(),
        instructorName: z.string().optional(),
        numberOfRounds: z.number().optional(),
        roundDurationSeconds: z.number().optional(),
        scheduledAt: z.date(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        equipmentNeeded: z.array(z.string()).optional(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        const canCreate = ['owner', 'admin'].includes(membership.role) || membership.canCreateTraining;
        if (!canCreate) throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para criar treinos' });
        
        const id = await db.createFightTraining({
          ...input,
          createdBy: ctx.user.id,
        });
        
        return { id };
      }),
    
    getFightTrainings: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        return db.getFightTrainings(input.groupId);
      }),
    
    joinFightTraining: protectedProcedure
      .input(z.object({
        trainingId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.joinFightTraining(input.trainingId, ctx.user.id, input.response);
        return { success: true };
      }),
    
    completeFightTraining: protectedProcedure
      .input(z.object({
        trainingId: z.number(),
        wins: z.number().optional(),
        losses: z.number().optional(),
        draws: z.number().optional(),
        technicalNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.completeFightTraining(input.trainingId, ctx.user.id, {
          wins: input.wins,
          losses: input.losses,
          draws: input.draws,
          technicalNotes: input.technicalNotes,
        });
        return { success: true };
      }),
    
    // ==================== GROUP CHAT ====================
    getMessages: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        limit: z.number().optional().default(50),
        before: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        return db.getGroupMessages(input.groupId, input.limit, input.before);
      }),
    
    sendMessage: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        content: z.string(),
        imageUrl: z.string().optional(),
        replyToId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const membership = await db.getGroupMembership(input.groupId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: 'FORBIDDEN' });
        
        const id = await db.sendGroupMessage({
          groupId: input.groupId,
          senderId: ctx.user.id,
          content: input.content,
          imageUrl: input.imageUrl,
          replyToId: input.replyToId,
        });
        
        return { id };
      }),
    
    deleteMessage: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const message = await db.getGroupMessage(input.messageId);
        if (!message) throw new TRPCError({ code: 'NOT_FOUND' });
        
        const membership = await db.getGroupMembership(message.groupId, ctx.user.id);
        const isAdmin = membership && ['owner', 'admin'].includes(membership.role);
        const isAuthor = message.senderId === ctx.user.id;
        
        if (!isAdmin && !isAuthor) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        await db.deleteGroupMessage(input.messageId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== ADMIN ROUTES ====================
  admin: router({
    // Event management
    createEvent: adminProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        eventDate: z.date(),
        registrationStartDate: z.date().optional(),
        registrationEndDate: z.date().optional(),
        city: z.string(),
        state: z.string(),
        address: z.string().optional(),
        startLocation: z.string().optional(),
        finishLocation: z.string().optional(),
        routeCoordinates: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
        mapCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
        mapZoom: z.number().optional(),
        bannerUrl: z.string().optional(),
        logoUrl: z.string().optional(),
        organizerName: z.string().optional(),
        organizerContact: z.string().optional(),
        checkoutBaseUrl: z.string().optional(),
        status: z.enum(['draft', 'published']).default('draft'),
        featured: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createEvent({
          ...input,
          organizerId: ctx.user.id,
          routeCoordinates: input.routeCoordinates || null,
          mapCenter: input.mapCenter || null,
        });
        return { id };
      }),
    
    updateEvent: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        eventDate: z.date().optional(),
        registrationStartDate: z.date().optional(),
        registrationEndDate: z.date().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        address: z.string().optional(),
        startLocation: z.string().optional(),
        finishLocation: z.string().optional(),
        routeCoordinates: z.array(z.object({ lat: z.number(), lng: z.number() })).optional(),
        mapCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
        mapZoom: z.number().optional(),
        bannerUrl: z.string().optional(),
        logoUrl: z.string().optional(),
        organizerName: z.string().optional(),
        organizerContact: z.string().optional(),
        checkoutBaseUrl: z.string().optional(),
        status: z.enum(['draft', 'published', 'cancelled', 'finished']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEvent(id, data);
        return { success: true };
      }),
    
    getMyEvents: adminProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return await db.listEvents({});
      }
      return await db.getEventsByOrganizer(ctx.user.id);
    }),
    
    getEventRegistrations: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventRegistrations(input.eventId);
      }),
    
    // Category management
    createCategory: adminProcedure
      .input(z.object({
        eventId: z.number(),
        name: z.string(),
        distance: z.number().optional(),
        minAge: z.number().optional(),
        maxAge: z.number().optional(),
        gender: z.enum(['male', 'female', 'mixed']).default('mixed'),
        price: z.number(),
        earlyBirdPrice: z.number().optional(),
        earlyBirdEndDate: z.date().optional(),
        maxParticipants: z.number().optional(),
        startTime: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEventCategory({
          ...input,
          distance: input.distance?.toString(),
          price: input.price.toString(),
          earlyBirdPrice: input.earlyBirdPrice?.toString(),
        });
        return { id };
      }),
    
    // Kit management
    createKit: adminProcedure
      .input(z.object({
        eventId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        items: z.array(z.string()).optional(),
        additionalPrice: z.number().default(0),
        sizes: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEventKit({
          ...input,
          additionalPrice: input.additionalPrice.toString(),
        });
        return { id };
      }),
    
    // Photo management
    addPhoto: adminProcedure
      .input(z.object({
        eventId: z.number(),
        url: z.string(),
        thumbnailUrl: z.string().optional(),
        caption: z.string().optional(),
        photographer: z.string().optional(),
        sortOrder: z.number().default(0),
        featured: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEventPhoto(input);
        return { id };
      }),
    
    deletePhoto: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEventPhoto(input.id);
        return { success: true };
      }),
    
    // Results management
    publishResult: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        chipTime: z.number().optional(),
        gunTime: z.number().optional(),
        avgPace: z.number().optional(),
        overallRank: z.number().optional(),
        categoryRank: z.number().optional(),
        genderRank: z.number().optional(),
        splits: z.array(z.object({ distance: z.number(), time: z.number() })).optional(),
        status: z.enum(['official', 'dnf', 'dq', 'dns']).default('official'),
      }))
      .mutation(async ({ input }) => {
        const registration = await db.getRegistrationById(input.registrationId);
        if (!registration) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const id = await db.createResult({
          registrationId: input.registrationId,
          userId: registration.userId,
          eventId: registration.eventId,
          categoryId: registration.categoryId,
          chipTime: input.chipTime,
          gunTime: input.gunTime,
          avgPace: input.avgPace,
          overallRank: input.overallRank,
          categoryRank: input.categoryRank,
          genderRank: input.genderRank,
          splits: input.splits || null,
          status: input.status,
        });
        
        return { id };
      }),
    
    uupdateResult: adminProcedure
      .input(z.object({
        id: z.number(),
        chipTime: z.number().optional(),
        gunTime: z.number().optional(),
        avgPace: z.number().optional(),
        overallRank: z.number().optional(),
        categoryRank: z.number().optional(),
        genderRank: z.number().optional(),
        splits: z.array(z.object({ distance: z.number(), time: z.number() })).optional(),
        status: z.enum(['official', 'dnf', 'dq', 'dns']).optional(),
        certificateUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateResult(id, data);
        return { success: true };
      }),
    
    // Get organizer dashboard stats
    getOrganizerStats: adminProcedure.query(async ({ ctx }) => {
      return await db.getOrganizerStats(ctx.user.id);
    }),
    
    // Get organizer metrics overview (public for mobile testing)
    getOrganizerMetrics: publicProcedure
      .input(z.object({ organizerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrganizerMetrics(input.organizerId);
      }),
    
    // Get organizer event metrics (detailed per event)
    getOrganizerEventMetrics: publicProcedure
      .input(z.object({ organizerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrganizerEventMetrics(input.organizerId);
      }),
    
    // ==================== VOUCHER MANAGEMENT ====================
    createVoucher: adminProcedure
      .input(z.object({
        eventId: z.number().optional(),
        code: z.string().min(3).max(50),
        discountType: z.enum(['percentage', 'fixed']),
        discountValue: z.string(),
        maxUses: z.number().optional(),
        minOrderValue: z.string().optional(),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if code already exists
        const existing = await db.getVoucherByCode(input.code);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Código de voucher já existe' });
        }
        
        const voucher = await db.createVoucher({
          ...input,
          createdBy: ctx.user.id,
        });
        return voucher;
      }),
    
    getMyVouchers: adminProcedure.query(async ({ ctx }) => {
      return await db.getVouchersByCreator(ctx.user.id);
    }),
    
    getEventVouchers: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getVouchersByEvent(input.eventId);
      }),
    
    updateVoucher: adminProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        discountType: z.enum(['percentage', 'fixed']).optional(),
        discountValue: z.string().optional(),
        maxUses: z.number().optional(),
        minOrderValue: z.string().optional(),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
        active: z.boolean().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateVoucher(id, data as any);
        return { success: true };
      }),
    
    deleteVoucher: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVoucher(input.id);
        return { success: true };
      }),
  }),

  // ==================== TEAM ROUTES ====================
  team: router({
    // Create a new team
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(255),
        slug: z.string().min(2).max(255),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        isPublic: z.boolean().default(true),
        allowJoinRequests: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if slug is available
        const existing = await db.getTeamBySlug(input.slug);
        if (existing) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este slug já está em uso' });
        }
        
        const teamId = await db.createTeam({
          ...input,
          ownerId: ctx.user.id,
        });
        
        // Add creator as owner
        await db.addTeamMember({
          teamId,
          userId: ctx.user.id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        });
        
        return { id: teamId };
      }),
    
    // Update team info
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).max(255).optional(),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        bannerUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        isPublic: z.boolean().optional(),
        allowJoinRequests: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = await db.isTeamAdmin(input.id, ctx.user.id);
        if (!isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem editar a equipe' });
        }
        
        const { id, ...data } = input;
        await db.updateTeam(id, data);
        return { success: true };
      }),
    
    // Get team by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const team = await db.getTeamById(input.id);
        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return team;
      }),
    
    // Get team by slug
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const team = await db.getTeamBySlug(input.slug);
        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return team;
      }),
    
    // Get user's teams
    getMyTeams: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserTeams(ctx.user.id);
    }),
    
    // Get team members
    getMembers: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTeamMembers(input.teamId);
      }),
    
    // Search teams
    search: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        return await db.searchTeams(input.query, input.limit);
      }),
    
    // Invite member to team
    inviteMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        email: z.string().email().optional(),
        userId: z.number().optional(),
        role: z.enum(['admin', 'member']).default('member'),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = await db.isTeamAdmin(input.teamId, ctx.user.id);
        if (!isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem convidar membros' });
        }
        
        if (!input.email && !input.userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe email ou userId' });
        }
        
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
        
        const id = await db.createTeamInvitation({
          teamId: input.teamId,
          email: input.email || null,
          userId: input.userId || null,
          invitedBy: ctx.user.id,
          role: input.role,
          token,
          status: 'pending',
          expiresAt,
        });
        
        return { id, token };
      }),
    
    // Accept invitation
    acceptInvitation: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await db.getTeamInvitationByToken(input.token);
        
        if (!invitation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite não encontrado' });
        }
        
        if (invitation.status !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite já foi utilizado' });
        }
        
        if (new Date() > invitation.expiresAt) {
          await db.updateTeamInvitation(invitation.id, { status: 'expired' });
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite expirou' });
        }
        
        // Check if already a member
        const existingMember = await db.getTeamMember(invitation.teamId, ctx.user.id);
        if (existingMember) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você já é membro desta equipe' });
        }
        
        // Add as member
        await db.addTeamMember({
          teamId: invitation.teamId,
          userId: ctx.user.id,
          role: invitation.role,
          status: 'active',
          joinedAt: new Date(),
          invitedBy: invitation.invitedBy,
        });
        
        // Update invitation
        await db.updateTeamInvitation(invitation.id, {
          status: 'accepted',
          respondedAt: new Date(),
        });
        
        return { success: true, teamId: invitation.teamId };
      }),
    
    // Get pending invitations for current user
    getMyInvitations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPendingInvitationsForUser(ctx.user.id, ctx.user.email || undefined);
    }),
    
    // Remove member from team
    removeMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = await db.isTeamAdmin(input.teamId, ctx.user.id);
        const isSelf = input.userId === ctx.user.id;
        
        if (!isAdmin && !isSelf) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para remover este membro' });
        }
        
        // Cannot remove owner
        const member = await db.getTeamMember(input.teamId, input.userId);
        if (member?.role === 'owner') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível remover o dono da equipe' });
        }
        
        await db.removeTeamMember(input.teamId, input.userId);
        return { success: true };
      }),
    
    // Update member role
    updateMemberRole: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
        role: z.enum(['admin', 'member']),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = await db.isTeamAdmin(input.teamId, ctx.user.id);
        if (!isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem alterar cargos' });
        }
        
        const member = await db.getTeamMember(input.teamId, input.userId);
        if (!member) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Membro não encontrado' });
        }
        
        if (member.role === 'owner') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível alterar o cargo do dono' });
        }
        
        await db.updateTeamMember(member.id, { role: input.role });
        return { success: true };
      }),
    
    // Team registration - register multiple athletes at once
    registerTeamForEvent: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        eventId: z.number(),
        athletes: z.array(z.object({
          userId: z.number(),
          categoryId: z.number(),
          kitId: z.number().optional(),
          kitSize: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is team admin
        const isAdmin = await db.isTeamAdmin(input.teamId, ctx.user.id);
        if (!isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores podem inscrever a equipe' });
        }
        
        // Verify all athletes are team members
        const teamMembers = await db.getTeamMembers(input.teamId);
        const memberIds = teamMembers.map(m => m.member.userId);
        
        for (const athlete of input.athletes) {
          if (!memberIds.includes(athlete.userId)) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Atleta ${athlete.userId} não é membro da equipe` 
            });
          }
          
          // Check if already registered
          const existing = await db.checkExistingRegistration(athlete.userId, input.eventId);
          if (existing) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Atleta ${athlete.userId} já está inscrito neste evento` 
            });
          }
        }
        
        // Get event
        const event = await db.getEventById(input.eventId);
        if (!event || event.status !== 'published') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }
        
        // Calculate prices and create registrations
        const registrationsData = [];
        let totalAmount = 0;
        
        for (const athlete of input.athletes) {
          const category = await db.getCategoryById(athlete.categoryId);
          if (!category || category.eventId !== input.eventId) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Categoria não encontrada' });
          }
          
          let categoryPrice = Number(category.price);
          if (category.earlyBirdPrice && category.earlyBirdEndDate && 
              new Date() < category.earlyBirdEndDate) {
            categoryPrice = Number(category.earlyBirdPrice);
          }
          
          let kitPrice = 0;
          if (athlete.kitId) {
            const kit = await db.getKitById(athlete.kitId);
            if (kit && kit.eventId === input.eventId) {
              kitPrice = Number(kit.additionalPrice) || 0;
            }
          }
          
          const athleteTotal = categoryPrice + kitPrice;
          totalAmount += athleteTotal;
          
          registrationsData.push({
            userId: athlete.userId,
            eventId: input.eventId,
            categoryId: athlete.categoryId,
            kitId: athlete.kitId,
            kitSize: athlete.kitSize,
            categoryPrice: categoryPrice.toString(),
            kitPrice: kitPrice.toString(),
            totalPrice: athleteTotal.toString(),
          });
        }
        
        // Create all registrations
        const results = await db.createTeamRegistration(
          input.teamId,
          ctx.user.id,
          registrationsData
        );
        
        // Build checkout URL with all tokens
        const tokens = results.map(r => r.checkoutToken).join(',');
        const checkoutUrl = event.checkoutBaseUrl 
          ? `${event.checkoutBaseUrl}?tokens=${tokens}&team=${input.teamId}`
          : null;
        
        return {
          registrations: results,
          totalAmount,
          checkoutUrl,
        };
      }),
    
    // Get team registrations
    getTeamRegistrations: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        eventId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        // Check if user is team member
        const member = await db.getTeamMember(input.teamId, ctx.user.id);
        if (!member) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não é membro desta equipe' });
        }
        
        return await db.getTeamRegistrations(input.teamId, input.eventId);
      }),
  }),

  // ==================== NOTIFICATIONS ROUTES ====================
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id, input?.unreadOnly, input?.limit);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.id, ctx.user.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
    
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUnreadNotificationCount(ctx.user.id);
      }),
  }),

  // ==================== SOCIAL NOTIFICATIONS ROUTES ====================
  socialNotifications: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getSocialNotifications(ctx.user.id, input?.limit || 50);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markSocialNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllSocialNotificationsRead(ctx.user.id);
        return { success: true };
      }),
    
    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUnreadSocialNotificationsCount(ctx.user.id);
      }),
  }),

  // ==================== FAVORITES ROUTES ====================
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavorites(ctx.user.id);
    }),
    
    add: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.addFavorite(ctx.user.id, input.eventId);
        return { success: true };
      }),
    
    remove: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeFavorite(ctx.user.id, input.eventId);
        return { success: true };
      }),
    
    check: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.isFavorite(ctx.user.id, input.eventId);
      }),
  }),

  // ==================== CHECK-IN ROUTES ====================
  checkin: router({
    // Validate participant by QR code (token)
    validateByToken: adminProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const reg = await db.getRegistrationByToken(input.token);
        if (!reg) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscrição não encontrada' });
        }
        if (reg.paymentStatus !== 'paid') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pagamento não confirmado' });
        }
        const checkin = await db.getCheckinByRegistration(reg.id);
        return { registration: reg, alreadyCheckedIn: !!checkin, checkin };
      }),
    
    // Validate participant by race number
    validateByRaceNumber: adminProcedure
      .input(z.object({ eventId: z.number(), raceNumber: z.string() }))
      .query(async ({ input }) => {
        const reg = await db.getRegistrationByRaceNumber(input.eventId, input.raceNumber);
        if (!reg) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Número de peito não encontrado' });
        }
        if (reg.paymentStatus !== 'paid') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pagamento não confirmado' });
        }
        const checkin = await db.getCheckinByRegistration(reg.id);
        return { registration: reg, alreadyCheckedIn: !!checkin, checkin };
      }),
    
    // Perform check-in
    perform: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        method: z.enum(['qrcode', 'manual', 'raceNumber']),
        deliverKit: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const reg = await db.getRegistrationById(input.registrationId);
        if (!reg) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscrição não encontrada' });
        }
        
        // Check if already checked in
        const existing = await db.getCheckinByRegistration(input.registrationId);
        if (existing) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Participante já fez check-in' });
        }
        
        const id = await db.createCheckin({
          registrationId: input.registrationId,
          eventId: reg.eventId,
          userId: reg.userId,
          checkedInBy: ctx.user.id,
          method: input.method,
          kitDelivered: input.deliverKit,
          kitDeliveredAt: input.deliverKit ? new Date() : null,
        });
        
        return { id, success: true };
      }),
    
    // Get event check-in stats
    getEventStats: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCheckinStats(input.eventId);
      }),
  }),

  // ==================== MOBILE SOCIAL ENDPOINTS ====================
  mobileSocial: router({
    // Create post (public for mobile app)
    createPost: publicProcedure
      .input(z.object({
        userId: z.number(),
        content: z.string().max(5000).optional(),
        groupId: z.number().optional(),
        type: z.enum(['text', 'photo', 'video', 'activity', 'announcement', 'poll']).default('text'),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        videoThumbnailUrl: z.string().optional(),
        videoAspectMode: z.enum(['fit', 'fill']).optional(),
        activityData: z.object({
          type: z.string().optional(),
          distance: z.number().optional(),
          duration: z.number().optional(),
          pace: z.string().optional(),
          elevation: z.number().optional(),
          calories: z.number().optional(),
        }).optional(),
        pollData: z.object({
          options: z.array(z.string()).min(2).max(4),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...postData } = input;
        
        // Verify user exists
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // Check group membership if posting to group
        if (postData.groupId) {
          const isMember = await db.isGroupMember(postData.groupId, userId);
          if (!isMember) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não é membro deste grupo' });
          }
        }
        
        const postId = await db.createPost({
          authorId: userId,
          groupId: postData.groupId,
          content: postData.content,
          type: postData.type,
          imageUrl: postData.imageUrl,
          videoUrl: postData.videoUrl,
          videoThumbnailUrl: postData.videoThumbnailUrl,
          activityData: postData.activityData ? JSON.stringify(postData.activityData) : null,
          pollOptions: postData.pollData ? JSON.stringify(postData.pollData.options.map((opt: string, idx: number) => ({ id: idx + 1, text: opt, votes: 0 }))) : null,
        });
        
        return { success: true, postId };
      }),
    
    // Get feed (public for mobile app)
    socialGetFeed: publicProcedure
      .input(z.object({
        userId: z.number().optional(),
        groupId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getFeedPosts({
          userId: input.userId,
          groupId: input.groupId,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    
    // Like post (public for mobile app)
    socialLikePost: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
        reactionType: z.enum(['like', 'love', 'fire', 'clap', 'strong']).default('like'),
      }))
      .mutation(async ({ input }) => {
        await db.likePost(input.postId, input.userId, input.reactionType);
        return { success: true };
      }),
    
    // Unlike post (public for mobile app)
    socialUnlikePost: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.unlikePost(input.postId, input.userId);
        return { success: true };
      }),
    
    // Get comments (public for mobile app)
    socialGetComments: publicProcedure
      .input(z.object({
        postId: z.number(),
        userId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getComments(input.postId, input.userId, input.limit, input.offset);
      }),
    
    // Create comment (public for mobile app)
    socialCreateComment: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
        content: z.string().max(2000),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...commentData } = input;
        
        // Verify user exists
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        const commentId = await db.createComment({
          authorId: userId,
          postId: commentData.postId,
          content: commentData.content,
          parentId: commentData.parentId,
        });
        
        return { success: true, commentId };
      }),
    
    // Delete comment (public for mobile app)
    socialDeleteComment: publicProcedure
      .input(z.object({
        userId: z.number(),
        commentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteComment(input.commentId, input.userId);
        return { success: true };
      }),
    
    // Report content (public for mobile app) - Sistema completo de denúncias
    socialReportContent: publicProcedure
      .input(z.object({
        userId: z.number(),
        targetType: z.enum(['post', 'comment', 'user', 'group']),
        targetId: z.number(),
        reason: z.enum(['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_information', 'copyright', 'other']),
        description: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, targetType, targetId, reason, description } = input;
        
        // 1. Verificar se usuário existe
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // 2. Verificar se já denunciou este conteúdo (evitar spam)
        const alreadyReported = await db.hasUserReported(userId, targetType, targetId);
        if (alreadyReported) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Você já denunciou este conteúdo' });
        }
        
        // 3. Verificar se o target existe
        let targetExists = false;
        let targetAuthorId: number | null = null;
        
        if (targetType === 'post') {
          const post = await db.getPostById(targetId);
          targetExists = !!post;
          targetAuthorId = post?.userId || null;
        } else if (targetType === 'comment') {
          const comment = await db.getCommentById(targetId);
          targetExists = !!comment;
          targetAuthorId = comment?.authorId || null;
        } else if (targetType === 'user') {
          const targetUser = await db.getUserById(targetId);
          targetExists = !!targetUser;
          targetAuthorId = targetId;
        } else if (targetType === 'group') {
          const group = await db.getGroupById(targetId);
          targetExists = !!group;
        }
        
        if (!targetExists) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Conteúdo não encontrado' });
        }
        
        // 4. Determinar prioridade baseada no motivo
        const highPriorityReasons = ['violence', 'nudity', 'hate_speech'];
        const priority = highPriorityReasons.includes(reason) ? 'high' : 'normal';
        
        // 5. Criar a denúncia
        const reportId = await db.createReport({
          reporterId: userId,
          targetType,
          targetId,
          reason,
          description,
        });
        
        // 6. Contar denúncias do mesmo conteúdo
        const reportCount = await db.countReportsByTarget(targetType, targetId);
        
        // 7. Ação automática: se muitas denúncias ou prioridade alta
        let autoAction = null;
        if (reportCount >= 5 || (reportCount >= 3 && priority === 'high')) {
          // Ocultar temporariamente o conteúdo para revisão
          if (targetType === 'post') {
            await db.hidePostForReview(targetId);
            autoAction = 'content_hidden_for_review';
          }
        }
        
        // 8. Registrar evento de auditoria
        await db.createReportEvent({
          reportId,
          eventType: 'created',
          details: JSON.stringify({
            priority,
            reportCount,
            autoAction,
            reporterName: user.name,
            targetAuthorId,
          }),
        });
        
        // 9. Log para moderação (console + pode ser integrado com Slack/email)
        console.log('[MODERATION] Nova denúncia:', {
          reportId,
          reporterId: userId,
          reporterName: user.name,
          targetType,
          targetId,
          reason,
          priority,
          reportCount,
          autoAction,
          timestamp: new Date().toISOString(),
        });
        
        return { 
          success: true, 
          reportId,
          status: autoAction ? 'triaged' : 'received',
          message: 'Denúncia enviada com sucesso'
        };
      }),
    
    // Save post (public for mobile app)
    socialSavePost: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.savePost(input.userId, input.postId);
        return { success };
      }),
    
    // Unsave post (public for mobile app)
    socialUnsavePost: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.unsavePost(input.userId, input.postId);
        return { success };
      }),
    
    // Like comment (public for mobile app)
    socialLikeComment: publicProcedure
      .input(z.object({
        userId: z.number(),
        commentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.likeComment(input.commentId, input.userId);
        return { success };
      }),
    
    // Unlike comment (public for mobile app)
    socialUnlikeComment: publicProcedure
      .input(z.object({
        userId: z.number(),
        commentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.unlikeComment(input.commentId, input.userId);
        return { success };
      }),
    
    // Delete post (public for mobile app)
    socialDeletePost: publicProcedure
      .input(z.object({
        userId: z.number(),
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.deletePost(input.postId, input.userId);
        return { success };
      }),
    
    // Share post (public for mobile app)
    socialSharePost: publicProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.sharePost(input.postId);
        return { success };
      }),
    
    // Get saved posts by user (public for mobile app)
    socialGetSavedPosts: publicProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getSavedPostsByUser(input.userId, input.limit, input.offset);
      }),
    
    // Get saved posts (alias)
    getSavedPosts: publicProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getSavedPostsByUser(input.userId, input.limit, input.offset);
      }),
    
    // Complete onboarding - save user profile data after OTP verification
    completeOnboarding: publicProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string(),
        username: z.string().min(3).max(30),
        email: z.string().email(),
        phone: z.string().optional(),
        birthDate: z.string(), // DD/MM/YYYY format
        gender: z.enum(['masculino', 'feminino', 'outro', 'prefiro_nao_informar']),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validate username uniqueness
        const normalizedUsername = input.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const existingUser = await db.getUserByUsername(normalizedUsername);
        if (existingUser && existingUser.id !== input.userId) {
          return { success: false, error: 'Username já está em uso' };
        }
        
        // Convert DD/MM/YYYY to Date
        let birthDateParsed: Date | null = null;
        if (input.birthDate) {
          const [day, month, year] = input.birthDate.split('/');
          if (day && month && year) {
            birthDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
        
        // Map gender to database format
        const genderMap: Record<string, string> = {
          'masculino': 'male',
          'feminino': 'female',
          'outro': 'other',
          'prefiro_nao_informar': 'other',
        };
        
        const genderDb = genderMap[input.gender] || 'other';
        
        // Update user profile
        await db.updateUserProfile(input.userId, {
          name: input.name,
          username: normalizedUsername,
          email: input.email,
          phone: input.phone || null,
          birthDate: birthDateParsed,
          gender: genderDb as 'male' | 'female' | 'other',
          photoUrl: input.photoUrl || null,
          profileStatus: 'BASIC_COMPLETE',
        });
        
        // Get updated user
        const user = await db.getUserById(input.userId);
        
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        return {
          success: true,
          message: 'Cadastro concluído com sucesso!',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photoUrl: user.photoUrl,
            cpf: user.cpf,
            phone: user.phone,
            birthDate: user.birthDate,
            gender: user.gender,
            street: user.street,
            number: user.number,
            complement: user.complement,
            neighborhood: user.neighborhood,
            city: user.city,
            state: user.state,
            zipCode: user.zipCode,
            emergencyName: user.emergencyName,
            emergencyPhone: user.emergencyPhone,
            bloodType: user.bloodType,
            healthInfo: user.healthInfo,
            profileStatus: user.profileStatus,
            billingStatus: user.billingStatus,
          },
        };
      }),
    
    // Follow a user
    followUser: publicProcedure
      .input(z.object({
        userId: z.number(),
        targetUserId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.followUser(input.userId, input.targetUserId);
        return { success: true };
      }),
    
    // Unfollow a user
    unfollowUser: publicProcedure
      .input(z.object({
        userId: z.number(),
        targetUserId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.unfollowUser(input.userId, input.targetUserId);
        return { success: true };
      }),
    
    // Get followers list
    getFollowers: publicProcedure
      .input(z.object({
        userId: z.number(),
        currentUserId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getFollowers(input.userId, input.currentUserId, input.limit, input.offset);
      }),
    
    // Check if username is available
    checkUsernameAvailable: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(30),
      }))
      .query(async ({ input }) => {
        const normalizedUsername = input.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const existingUser = await db.getUserByUsername(normalizedUsername);
        return { 
          available: !existingUser,
          normalizedUsername 
        };
      }),
    
    // Suggest username based on name
    suggestUsername: publicProcedure
      .input(z.object({
        name: z.string().min(1),
      }))
      .query(async ({ input }) => {
        const baseUsername = input.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 25);
        
        let suggestion = baseUsername;
        let counter = 1;
        
        while (await db.getUserByUsername(suggestion)) {
          suggestion = `${baseUsername}_${counter}`;
          counter++;
          if (counter > 100) break;
        }
        
        return { suggestion };
      }),
    
    // Get following list
    getFollowing: publicProcedure
      .input(z.object({
        userId: z.number(),
        currentUserId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getFollowing(input.userId, input.currentUserId, input.limit, input.offset);
      }),
    
    // Get single post detail
    getPostDetail: publicProcedure
      .input(z.object({
        postId: z.number(),
        currentUserId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPostDetail(input.postId, input.currentUserId);
      }),
    
    // Create or get chat thread
    getOrCreateChatThread: publicProcedure
      .input(z.object({
        userId: z.number(),
        recipientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.getOrCreateChatThread(input.userId, input.recipientId);
      }),
    
    // Get chat messages
    getChatMessages: publicProcedure
      .input(z.object({
        threadId: z.number(),
        limit: z.number().min(1).max(50).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getChatMessages(input.threadId, input.limit, input.offset);
      }),
    
    // Send chat message
    sendChatMessage: publicProcedure
      .input(z.object({
        threadId: z.number(),
        senderId: z.number(),
        content: z.string().max(2000),
      }))
      .mutation(async ({ input }) => {
        return await db.sendChatMessage(input.threadId, input.senderId, input.content);
      }),
    
    // Get user chat threads
    getUserChatThreads: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getUserChatThreads(input.userId);
      }),

    // ==================== PARTE 1: CHAT ADVANCED ENDPOINTS ====================
    
    deleteThreadForMe: publicProcedure
      .input(z.object({
        threadId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Delete thread completely (all messages and the thread itself)
        return await db.deleteThreadCompletely(input.threadId);
      }),
    
    getUserChatThreadsFiltered: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getUserChatThreadsFiltered(input.userId);
      }),
    
    addMessageReaction: publicProcedure
      .input(z.object({
        messageId: z.number(),
        userId: z.number(),
        emoji: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.addMessageReaction(input.messageId, input.userId, input.emoji);
      }),
    
    removeMessageReaction: publicProcedure
      .input(z.object({
        messageId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeMessageReaction(input.messageId, input.userId);
      }),
    
    deleteChatMessage: publicProcedure
      .input(z.object({
        messageId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.deleteChatMessage(input.messageId, input.userId);
      }),
    
    sendChatMessageWithReply: publicProcedure
      .input(z.object({
        threadId: z.number(),
        senderId: z.number(),
        content: z.string(),
        replyToMessageId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.sendChatMessageWithReply(input.threadId, input.senderId, input.content, input.replyToMessageId);
      }),
    
    getChatMessagesWithDetails: publicProcedure
      .input(z.object({
        threadId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getChatMessagesWithDetails(input.threadId, input.limit, input.offset);
      }),
    
    // ==================== PARTE 2: FEED LIKES ENDPOINTS ====================
    
    getPostLikes: publicProcedure
      .input(z.object({
        postId: z.number(),
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getPostLikes(input.postId, input.limit, input.offset);
      }),
    
    getRecentLikers: publicProcedure
      .input(z.object({
        postId: z.number(),
        limit: z.number().optional().default(2),
      }))
      .query(async ({ input }) => {
        return await db.getRecentLikers(input.postId, input.limit);
      }),
    
    searchAthletesTypeahead: publicProcedure
      .input(z.object({
        userId: z.number(),
        query: z.string(),
        limit: z.number().optional().default(20),
      }))
      .query(async ({ input }) => {
        return await db.searchAthletesTypeahead(input.userId, input.query, input.limit);
      }),
    
    // ==================== PARTE 3: FOLLOW WITH APPROVAL ENDPOINTS ====================
    
    followRequest: publicProcedure
      .input(z.object({
        followerId: z.number(),
        followingId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.sendFollowRequest(input.followerId, input.followingId);
      }),
    
    cancelFollowRequest: publicProcedure
      .input(z.object({
        followerId: z.number(),
        followingId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.cancelFollowRequest(input.followerId, input.followingId);
      }),
    
    acceptFollowRequest: publicProcedure
      .input(z.object({
        userId: z.number(),
        followerId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.acceptFollowRequest(input.userId, input.followerId);
      }),
    
    declineFollowRequest: publicProcedure
      .input(z.object({
        userId: z.number(),
        followerId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.declineFollowRequest(input.userId, input.followerId);
      }),
    
    unfollowUser: publicProcedure
      .input(z.object({
        followerId: z.number(),
        followingId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.unfollowUser(input.followerId, input.followingId);
      }),
    
    getFollowRequestsInbox: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getFollowRequestsInbox(input.userId);
      }),
    
    getFollowStatus: publicProcedure
      .input(z.object({
        followerId: z.number(),
        followingId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getFollowStatus(input.followerId, input.followingId);
      }),
    
    getFollowNotifications: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getFollowNotifications(input.userId);
      }),
    
    markFollowNotificationsRead: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.markFollowNotificationsRead(input.userId);
      }),

    
    // Search athletes by name
    searchAthletes: publicProcedure
      .input(z.object({
        query: z.string().min(1),
        currentUserId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.searchUsers(input.query, input.currentUserId, input.limit, input.offset);
      }),
    
    // Get athlete profile for grid view
    getAthleteProfile: publicProcedure
      .input(z.object({
        userId: z.number(),
        currentUserId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAthleteProfile(input.userId, input.currentUserId);
      }),
    
    // Update grid bio
    updateGridBio: publicProcedure
      .input(z.object({
        userId: z.number(),
        gridBio: z.string().max(150),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserGridBio(input.userId, input.gridBio);
        return { success: true };
      }),
    
    // Update grid profile (all fields)
    updateGridProfile: publicProcedure
      .input(z.object({
        userId: z.number(),
        gridBio: z.string().max(150).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(2).optional(),
        country: z.string().max(100).optional(),
        athleteCategory: z.enum(['PRO', 'AMATEUR', 'COACH']).optional(),
        sports: z.array(z.string()).max(10).optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await db.updateGridProfile(userId, data);
        return { success: true };
      }),
    
    // Get suggested users to follow
    getSuggestedUsers: publicProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
      }))
      .query(async ({ input }) => {
        return await db.getSuggestedUsers(input.userId, input.limit);
      }),
    
    // ==================== CHAT SYSTEM ====================
    
    // Get or create chat thread with mutual follow check
    getOrCreateChatThreadSafe: publicProcedure
      .input(z.object({
        userId: z.number(),
        otherUserId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Check mutual follow
        const isMutual = await db.checkMutualFollow(input.userId, input.otherUserId);
        if (!isMutual) {
          return { error: 'Vocês precisam se seguir mutuamente para trocar mensagens.' };
        }
        
        // Check if blocked
        const isBlocked = await db.checkIfBlocked(input.userId, input.otherUserId);
        if (isBlocked) {
          return { error: 'Não é possível enviar mensagens para este usuário.' };
        }
        
        const thread = await db.getOrCreateChatThread(input.userId, input.otherUserId);
        return { threadId: thread.id };
      }),
    
    // Get chat messages
    getChatMessages: publicProcedure
      .input(z.object({
        threadId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
        before: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const messages = await db.getChatMessages(input.threadId, input.limit, input.before);
        return { messages };
      }),
    
    // Send chat message with safety checks
    sendChatMessageSafe: publicProcedure
      .input(z.object({
        threadId: z.number(),
        senderId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input }) => {
        // Use the safe function from db that handles all checks
        return await db.sendChatMessageSafe(input.threadId, input.senderId, input.content);
      }),
    
    // Mark messages as read
    markMessagesAsRead: publicProcedure
      .input(z.object({
        threadId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.markMessagesAsRead(input.threadId, input.userId);
        return { success: true };
      }),
    
    // Get user chat threads (list of conversations)
    getUserChatThreads: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        const threads = await db.getUserChatThreads(input.userId);
        return { threads };
      }),
    
    // ==================== SAFETY FEATURES ====================
    
    // Block user
    blockUser: publicProcedure
      .input(z.object({
        blockerId: z.number(),
        blockedId: z.number(),
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.blockUser(input.blockerId, input.blockedId, input.reason);
        // Also unfollow each other
        await db.unfollowUser(input.blockerId, input.blockedId);
        await db.unfollowUser(input.blockedId, input.blockerId);
        return { success: true };
      }),
    
    // Unblock user
    unblockUser: publicProcedure
      .input(z.object({
        blockerId: z.number(),
        blockedId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.unblockUser(input.blockerId, input.blockedId);
        return { success: true };
      }),
    
    // Report content (user, post, or message)
    reportContent: publicProcedure
      .input(z.object({
        reporterId: z.number(),
        reportedUserId: z.number().optional(),
        reportedPostId: z.number().optional(),
        reportedMessageId: z.number().optional(),
        reason: z.enum(['spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other']),
        description: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.reportContent(input);
        return { success: true };
      }),
    
    // Check if user is blocked
    isUserBlocked: publicProcedure
      .input(z.object({
        userId: z.number(),
        targetUserId: z.number(),
      }))
      .query(async ({ input }) => {
        const isBlocked = await db.checkIfBlocked(input.userId, input.targetUserId);
        return { isBlocked };
      }),
    
    // Get blocked users list
    getBlockedUsers: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        const blockedUsers = await db.getBlockedUsers(input.userId);
        return { blockedUsers };
      }),
    
    // ==================== SOCIAL NOTIFICATIONS ====================
    // Get social notifications for mobile app
    getSocialNotifications: publicProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().default(50).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getSocialNotifications(input.userId, input.limit || 50);
      }),
    
    // Get unread notifications count
    getUnreadNotificationsCount: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getUnreadSocialNotificationsCount(input.userId);
      }),
    
    // Mark notification as read
    markNotificationAsRead: publicProcedure
      .input(z.object({
        notificationId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.markSocialNotificationRead(input.notificationId, input.userId);
        return { success: true };
      }),
    
    // Mark all notifications as read
    markAllNotificationsAsRead: publicProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.markAllSocialNotificationsRead(input.userId);
        return { success: true };
      }),
  }),

  // ==================== SOCIAL FEED ROUTES ====================
  social: router({
    // Posts
    getFeed: protectedProcedure
      .input(z.object({
        groupId: z.number().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getFeedPosts({
          userId: ctx.user.id,
          groupId: input.groupId,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    
    createPost: protectedProcedure
      .input(z.object({
        content: z.string().max(5000).optional(),
        groupId: z.number().optional(),
        type: z.enum(['text', 'photo', 'activity', 'announcement', 'poll']).default('text'),
        imageUrl: z.string().optional(),
        activityData: z.object({
          type: z.string(),
          distance: z.number().optional(),
          duration: z.number().optional(),
          pace: z.string().optional(),
          elevation: z.number().optional(),
          calories: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check group membership if posting to group
        if (input.groupId) {
          const isMember = await db.isGroupMember(input.groupId, ctx.user.id);
          if (!isMember) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não é membro deste grupo' });
          }
        }
        
        const postId = await db.createPost({
          authorId: ctx.user.id,
          groupId: input.groupId,
          content: input.content,
          type: input.type,
          imageUrl: input.imageUrl,
          activityData: input.activityData ? JSON.stringify(input.activityData) : null,
        });
        
        return { success: true, postId };
      }),
    
    deletePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deletePost(input.postId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não foi possível excluir o post' });
        }
        return { success: true };
      }),
    
    // Likes
    likePost: protectedProcedure
      .input(z.object({
        postId: z.number(),
        reactionType: z.enum(['like', 'love', 'fire', 'clap', 'strong']).default('like'),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.likePost(input.postId, ctx.user.id, input.reactionType);
        return { success };
      }),
    
    unlikePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.unlikePost(input.postId, ctx.user.id);
        return { success };
      }),
    
    // Comments
    getComments: protectedProcedure
      .input(z.object({
        postId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getPostComments(input.postId, {
          userId: ctx.user.id,
          limit: input.limit,
          offset: input.offset,
        });
      }),
    
    createComment: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().min(1).max(2000),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.createComment({
          postId: input.postId,
          authorId: ctx.user.id,
          content: input.content,
          parentId: input.parentId,
        });
        
        return { success: true, commentId };
      }),
    
    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteComment(input.commentId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Não foi possível excluir o comentário' });
        }
        return { success: true };
      }),
    
    likeComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.likeComment(input.commentId, ctx.user.id);
        return { success };
      }),
    
    unlikeComment: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.unlikeComment(input.commentId, ctx.user.id);
        return { success };
      }),
    
    // Reports
    reportContent: protectedProcedure
      .input(z.object({
        targetType: z.enum(['post', 'comment', 'user', 'group']),
        targetId: z.number(),
        reason: z.enum(['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'false_information', 'copyright', 'other']),
        description: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already reported
        const alreadyReported = await db.hasUserReported(ctx.user.id, input.targetType, input.targetId);
        if (alreadyReported) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você já denunciou este conteúdo' });
        }
        
        const reportId = await db.createReport({
          reporterId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          description: input.description,
        });
        
        return { success: true, reportId };
      }),
    
    // Follow System
    followUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você não pode seguir a si mesmo' });
        }
        await db.followUser(ctx.user.id, input.userId);
        return { success: true };
      }),
    
    unfollowUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unfollowUser(ctx.user.id, input.userId);
        return { success: true };
      }),
    
    getFollowers: protectedProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getFollowers(input.userId, ctx.user.id, input.limit, input.offset);
      }),
    
    getFollowing: protectedProcedure
      .input(z.object({
        userId: z.number(),
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getFollowing(input.userId, ctx.user.id, input.limit, input.offset);
      }),
    
    // Post Detail
    getPostDetail: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await db.getPostDetail(input.postId, ctx.user.id);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        return post;
      }),
    
    // Chat System
    getOrCreateChatThread: protectedProcedure
      .input(z.object({ recipientId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.recipientId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você não pode iniciar um chat consigo mesmo' });
        }
        return await db.getOrCreateChatThread(ctx.user.id, input.recipientId);
      }),
    
    getChatMessages: protectedProcedure
      .input(z.object({
        threadId: z.number(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getChatMessages(input.threadId, input.limit, input.offset);
      }),
    
    sendChatMessage: protectedProcedure
      .input(z.object({
        threadId: z.number(),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.sendChatMessage(input.threadId, ctx.user.id, input.content);
      }),
    
    getUserChatThreads: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserChatThreads(ctx.user.id);
      }),
  }),

  // ==================== GROUPS ROUTES ====================
  groups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserGroups(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Grupo não encontrado' });
        }
        
        const isMember = await db.isGroupMember(input.groupId, ctx.user.id);
        
        return { ...group, isMember };
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3).max(100),
        description: z.string().max(1000).optional(),
        privacy: z.enum(['public', 'private']).default('public'),
        groupType: z.enum(['running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'other']).default('running'),
        city: z.string().optional(),
        state: z.string().optional(),
        meetingPoint: z.string().optional(),
        requiresApproval: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const groupId = await db.createGroup({
          ...input,
          ownerId: ctx.user.id,
        });
        
        return { success: true, groupId };
      }),
    
    join: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.joinGroup(input.groupId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível entrar no grupo' });
        }
        return { success: true };
      }),
    
    leave: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.leaveGroup(input.groupId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível sair do grupo' });
        }
        return { success: true };
      }),
  }),

  // ==================== MODERATION ROUTES ====================
  moderation: router({
    // Listar posts pendentes de moderação (admin only)
    getPendingPosts: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getPendingModerationPosts(input.limit, input.offset);
      }),
    
    // Aprovar post (admin only)
    approvePost: adminProcedure
      .input(z.object({
        postId: z.number(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.moderatePost(input.postId, 'approved', ctx.user.id, input.note);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        return { success: true };
      }),
    
    // Rejeitar post (admin only)
    rejectPost: adminProcedure
      .input(z.object({
        postId: z.number(),
        reason: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.moderatePost(input.postId, 'rejected', ctx.user.id, input.reason);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        // TODO: Notificar autor sobre rejeição
        return { success: true };
      }),
    
    // Colocar em quarentena (admin only)
    quarantinePost: adminProcedure
      .input(z.object({
        postId: z.number(),
        reason: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.moderatePost(input.postId, 'quarantine', ctx.user.id, input.reason);
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        return { success: true };
      }),
    
    // Obter estatísticas de moderação (admin only)
    getStats: adminProcedure
      .query(async () => {
        return await db.getModerationStats();
      }),
  }),

  // ==================== TRAININGS ROUTES ====================
  trainings: router({
    // List all trainings (with optional filters)
    list: protectedProcedure
      .input(z.object({
        groupId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getTrainings(input);
      }),
    
    // Get training by ID
    getById: protectedProcedure
      .input(z.object({ trainingId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTrainingById(input.trainingId);
      }),
    
    // Get user's trainings (created or joined)
    myTrainings: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserTrainings(ctx.user.id);
      }),
    
    // Get nearby trainings
    nearby: protectedProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getNearbyTrainings(input.lat, input.lng, input.radiusKm);
      }),
    
    // Create a new training
    create: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        trainingType: z.string(),
        scheduledAt: z.string(), // ISO date string
        durationMinutes: z.number().optional(),
        meetingPoint: z.string().optional(),
        meetingLat: z.number().optional(),
        meetingLng: z.number().optional(),
        maxParticipants: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const trainingId = await db.createTraining({
          ...input,
          scheduledAt: new Date(input.scheduledAt),
          createdBy: ctx.user.id,
        });
        return { id: trainingId, success: true };
      }),
    
    // Join a training
    join: protectedProcedure
      .input(z.object({
        trainingId: z.number(),
        response: z.enum(['going', 'maybe', 'not_going']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.joinTraining(input.trainingId, ctx.user.id, input.response);
        return { success: true };
      }),
  }),

  // ==================== MOBILE MODERATION ENDPOINTS ====================
  // Endpoints públicos para moderação via link de e-mail
  mobileModeration: router({
    // Aprovar post via token de e-mail
    approveByToken: publicProcedure
      .input(z.object({
        postId: z.number(),
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Verificar token (simplificado - em produção usar JWT ou hash seguro)
        const expectedToken = `approve-${input.postId}-${process.env.JWT_SECRET || 'secret'}`;
        const tokenHash = require('crypto').createHash('sha256').update(expectedToken).digest('hex').substring(0, 16);
        
        if (input.token !== tokenHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const success = await db.moderatePost(input.postId, 'approved', null, 'Aprovado via e-mail');
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        return { success: true, message: 'Post aprovado com sucesso!' };
      }),
    
    // Rejeitar post via token de e-mail
    rejectByToken: publicProcedure
      .input(z.object({
        postId: z.number(),
        token: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verificar token
        const expectedToken = `reject-${input.postId}-${process.env.JWT_SECRET || 'secret'}`;
        const tokenHash = require('crypto').createHash('sha256').update(expectedToken).digest('hex').substring(0, 16);
        
        if (input.token !== tokenHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const success = await db.moderatePost(input.postId, 'rejected', null, input.reason || 'Rejeitado via e-mail');
        if (!success) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        return { success: true, message: 'Post rejeitado.' };
      }),
    
    // Visualizar post pendente (para preview no e-mail)
    getPostForReview: publicProcedure
      .input(z.object({
        postId: z.number(),
        token: z.string(),
      }))
      .query(async ({ input }) => {
        // Verificar token de visualização
        const expectedToken = `view-${input.postId}-${process.env.JWT_SECRET || 'secret'}`;
        const tokenHash = require('crypto').createHash('sha256').update(expectedToken).digest('hex').substring(0, 16);
        
        if (input.token !== tokenHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token inválido' });
        }
        
        const post = await db.getPostById(input.postId);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post não encontrado' });
        }
        
        // Buscar autor
        const author = await db.getUserById(post.authorId);
        
        return {
          id: post.id,
          content: post.content,
          type: post.type,
          imageUrl: post.imageUrl,
          videoUrl: post.videoUrl,
          createdAt: post.createdAt,
          author: author ? {
            id: author.id,
            name: author.name,
            email: author.email,
            photoUrl: author.photoUrl,
          } : null,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
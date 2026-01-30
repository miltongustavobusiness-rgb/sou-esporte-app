// API Service - Conexão com Backend Real Sou Esporte
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== FEATURE FLAGS ====================
// Controla se a moderação de conteúdo é obrigatória
// false = modo testes (bypass de moderação, posts publicam direto)
// true = modo produção (posts precisam de aprovação)
export const MODERATION_REQUIRED = false;

// URL base da API - usa variável de ambiente ou fallback para IP local
const API_BASE_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.14:3000'}/api/trpc`;

// Log da URL para debug
console.log('[API] Base URL:', API_BASE_URL);

// Tipos de resposta da API
interface TrpcResponse<T> {
  result: {
    data: T;
  };
}

interface TrpcBatchResponse<T> {
  result: {
    data: T;
  };
}

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin' | 'organizer';
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  photoUrl?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  bloodType?: string | null;
  healthInfo?: string | null;
  totalRaces?: number;
  totalDistance?: string;
  bestTime5k?: number | null;
  bestTime10k?: number | null;
  bestTime21k?: number | null;
  bestTime42k?: number | null;
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  eventDate: string;
  eventTime: string | null; // HH:mm format
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  city: string;
  state: string;
  address: string | null;
  startLocation: string | null;
  finishLocation: string | null;
  routeCoordinates: { lat: number; lng: number }[] | null;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  organizerName: string | null;
  organizerContact: string | null;
  checkoutBaseUrl: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'finished';
  featured: boolean;
  organizerId: number;
  isPaidEvent: boolean; // true = evento pago, false = evento gratuito
  createdAt: string;
  updatedAt: string;
  // Campos de countdown
  serverTimeBrasilia?: string;
  eventStartAtBrasilia?: string | null;
  categoriesCount?: number;
  subscribersCount?: number;
  startTimeLabel?: string;
  server_time_brasilia?: string;
  event_start_at_brasilia?: string | null;
}

// Evento com estatísticas para o organizador
export interface OrganizerEvent {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  eventDate: string;
  city: string;
  state: string;
  status: 'draft' | 'published' | 'cancelled' | 'finished';
  bannerUrl: string | null;
  organizerName: string | null;
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  totalRevenue: number;
  maxParticipants: number;
  createdAt: string;
  // Preço do evento
  isPaidEvent?: boolean; // true = pago, false = gratuito
  // Engagement metrics
  viewCount?: number;
  likesCount?: number;
  sharesCount?: number;
}

export interface EventCategory {
  id: number;
  eventId: number;
  name: string;
  distance: string | null;
  minAge: number | null;
  maxAge: number | null;
  gender: 'male' | 'female' | 'mixed';
  isPaid: boolean; // true = categoria paga, false = categoria gratuita
  price: string;
  earlyBirdPrice: string | null;
  earlyBirdEndDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number | null;
  startTime: string | null;
}

export interface EventKit {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  items: string[] | null;
  additionalPrice: string;
  sizes: string[] | null;
  available: boolean;
}

export interface EventPhoto {
  id: number;
  eventId: number;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  photographer: string | null;
  sortOrder: number;
  featured: boolean;
}

export interface Registration {
  id: number;
  userId: number;
  eventId: number;
  categoryId: number;
  kitId: number | null;
  teamId: number | null;
  registeredBy: number | null;
  kitSize: string | null;
  categoryPrice: string;
  kitPrice: string;
  totalPrice: string;
  checkoutToken: string;
  paymentStatus: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentDate: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'noshow';
  raceNumber: string | null;
  createdAt: string;
  updatedAt: string;
  // Extended fields from API
  eventName?: string;
  eventDate?: string;
  eventCity?: string;
  eventState?: string;
  eventBannerUrl?: string;
  eventOrganizerName?: string;
  categoryName?: string;
  kitName?: string;
  bibNumber?: string;
  athleteName?: string;
  athleteEmail?: string;
  athleteCpf?: string;
  checkedIn?: boolean;
}

export interface RegistrationWithDetails extends Registration {
  event: Event;
  category: EventCategory;
  kit?: EventKit;
}

export interface Result {
  id: number;
  registrationId: number;
  userId: number;
  eventId: number;
  categoryId: number;
  chipTime: number | null;
  gunTime: number | null;
  avgPace: number | null;
  overallRank: number | null;
  categoryRank: number | null;
  genderRank: number | null;
  splits: { distance: number; time: number }[] | null;
  status: 'official' | 'dnf' | 'dq' | 'dns';
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventResult {
  id: number;
  position?: number;
  athleteName?: string;
  bibNumber?: string;
  categoryName?: string;
  chipTime?: string;
  gunTime?: string;
  pace?: string;
}

export interface ResultWithDetails {
  result: Result;
  event: Event;
  category: EventCategory;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  isPublic: boolean;
  allowJoinRequests: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
  nickname: string | null;
  jerseyNumber: string | null;
  joinedAt: string | null;
  invitedBy: number | null;
}

export interface TeamWithMembership {
  team: Team;
  membership: TeamMember;
}

export interface TeamMemberWithUser {
  member: TeamMember;
  user: User;
}

export interface TeamInvitation {
  id: number;
  teamId: number;
  email: string | null;
  userId: number | null;
  invitedBy: number;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
  respondedAt: string | null;
}

// Storage keys
const USER_KEY = '@SouEsporte:user';
const MODE_KEY = '@SouEsporte:mode';

// Classe de API
class ApiService {
  // Fazer requisição tRPC Query
  private async trpcQuery<T>(procedure: string, input?: any): Promise<T> {
    const url = new URL(`${API_BASE_URL}/${procedure}`);
    if (input !== undefined) {
      // tRPC with SuperJSON requires wrapping input in {json, meta} format for queries too
      url.searchParams.set('input', JSON.stringify({ json: input }));
    }

    console.log(`[API] 🚀 Query: ${procedure}`);
    if (input) console.log(`[API] 📦 Input:`, JSON.stringify(input).substring(0, 200));

    try {
      const startTime = Date.now();
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `API Error: ${response.status}`;
        
        // Log claro do tipo de erro
        if (response.status === 401) {
          console.log(`[API] 🔑 Query ${procedure}: TOKEN EXPIRADO (401) - ${responseTime}ms`);
        } else if (response.status >= 500) {
          console.log(`[API] 🖥️ Query ${procedure}: ERRO DO SERVIDOR (${response.status}) - ${responseTime}ms`);
        } else {
          console.log(`[API] ❌ Query ${procedure}: ERRO (${response.status}) - ${responseTime}ms - ${errorMsg}`);
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // tRPC with SuperJSON returns data in result.data.json format
      const resultData = data?.result?.data;
      
      // Log de sucesso com info sobre dados
      const hasData = resultData !== null && resultData !== undefined;
      const dataInfo = Array.isArray(resultData) ? `${resultData.length} items` : (hasData ? 'object' : 'null');
      console.log(`[API] ✅ Query ${procedure}: OK (${responseTime}ms) - ${dataInfo}`);
      
      if (resultData && typeof resultData === 'object' && 'json' in resultData) {
        return resultData.json as T;
      }
      return resultData as T;
    } catch (error: any) {
      // Classificar erro de rede
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch')) {
        console.log(`[API] 🌐 Query ${procedure}: FALHA DE REDE - Verifique conexão e se API está rodando`);
      } else if (error.name === 'AbortError') {
        console.log(`[API] ⏱️ Query ${procedure}: TIMEOUT`);
      }
      throw error;
    }
  }

  // Fazer requisição tRPC Mutation
  private async trpcMutation<T>(procedure: string, input?: any): Promise<T> {
    console.log(`[API] 🚀 Mutation: ${procedure}`);
    if (input) console.log(`[API] 📦 Input:`, JSON.stringify(input).substring(0, 200));
    
    // tRPC with SuperJSON requires wrapping input in {json, meta} format
    // Detect Date objects and add them to meta.values
    const metaValues: Record<string, string[]> = {};
    
    const processInput = (obj: any, path: string = ''): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj instanceof Date) {
        metaValues[path || 'root'] = ['Date'];
        return obj.toISOString();
      }
      if (Array.isArray(obj)) {
        return obj.map((item, index) => processInput(item, path ? `${path}.${index}` : `${index}`));
      }
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
          const newPath = path ? `${path}.${key}` : key;
          result[key] = processInput(obj[key], newPath);
        }
        return result;
      }
      return obj;
    };
    
    const processedInput = processInput(input);
    const body: any = { json: processedInput };
    if (Object.keys(metaValues).length > 0) {
      body.meta = { values: metaValues };
    }
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/${procedure}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.json?.message || errorData?.error?.message || `API Error: ${response.status}`;
        
        // Log claro do tipo de erro
        if (response.status === 401) {
          console.log(`[API] 🔑 Mutation ${procedure}: TOKEN EXPIRADO (401) - ${responseTime}ms`);
        } else if (response.status >= 500) {
          console.log(`[API] 🖥️ Mutation ${procedure}: ERRO DO SERVIDOR (${response.status}) - ${responseTime}ms`);
        } else {
          console.log(`[API] ❌ Mutation ${procedure}: ERRO (${response.status}) - ${responseTime}ms - ${errorMsg}`);
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // tRPC with SuperJSON returns data in result.data.json format
      const resultData = data?.result?.data;
      
      // Log de sucesso
      console.log(`[API] ✅ Mutation ${procedure}: OK (${responseTime}ms)`);
      
      if (resultData && typeof resultData === 'object' && 'json' in resultData) {
        return resultData.json as T;
      }
      return resultData as T;
    } catch (error: any) {
      // Classificar erro de rede
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch')) {
        console.log(`[API] 🌐 Mutation ${procedure}: FALHA DE REDE - Verifique conexão e se API está rodando`);
      } else if (error.name === 'AbortError') {
        console.log(`[API] ⏱️ Mutation ${procedure}: TIMEOUT`);
      }
      throw error;
    }
  }

  // ==================== AUTH ====================

  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.trpcQuery<User | null>('auth.me');
    } catch {
      return null;
    }
  }

  async logout(): Promise<{ success: boolean }> {
    const result = await this.trpcMutation<{ success: boolean }>('auth.logout');
    await AsyncStorage.removeItem(USER_KEY);
    return result;
  }

  // ==================== MODE ====================

  async setMode(mode: 'athlete' | 'organizer'): Promise<void> {
    await AsyncStorage.setItem(MODE_KEY, mode);
  }

  async getMode(): Promise<'athlete' | 'organizer'> {
    const mode = await AsyncStorage.getItem(MODE_KEY);
    return (mode as 'athlete' | 'organizer') || 'athlete';
  }

  // ==================== USER/PROFILE ====================

  async getProfile(): Promise<User | null> {
    try {
      return await this.trpcQuery<User>('user.getProfile');
    } catch {
      return null;
    }
  }

  async updateProfile(data: {
    userId: number;
    name?: string;
    cpf?: string;
    phone?: string;
    birthDate?: Date;
    gender?: 'male' | 'female' | 'other';
    photoUrl?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    bloodType?: string;
    healthInfo?: string;
  }): Promise<{ success: boolean; user?: User | null }> {
    // Use mobile.updateProfile endpoint which doesn't require OAuth session
    return this.trpcMutation('mobile.updateProfile', data);
  }

  async getStats(): Promise<{
    totalRaces: number;
    totalDistance: string;
    bestTime5k: number | null;
    bestTime10k: number | null;
    bestTime21k: number | null;
    bestTime42k: number | null;
  }> {
    return this.trpcQuery('user.getStats');
  }

  async getHistory(): Promise<ResultWithDetails[]> {
    return this.trpcQuery('user.getHistory');
  }

  // ==================== EVENTS ====================

  async listEvents(filters?: {
    city?: string;
    state?: string;
    dateFrom?: Date;
    dateTo?: Date;
    distance?: number;
    search?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'date' | 'name' | 'trending' | 'price';
    sortOrder?: 'asc' | 'desc';
    timeFilter?: 'upcoming' | 'past' | 'all';
    isPaidEvent?: boolean; // true = apenas pagos, false = apenas gratuitos
  }): Promise<Event[]> {
    return this.trpcQuery<Event[]>('events.list', filters);
  }

  async getFeaturedEvents(): Promise<Event[]> {
    return this.trpcQuery<Event[]>('events.getFeatured');
  }

  // Eventos em Alta - Sistema de Ranking Inteligente
  async getHighlightEvents(limit?: number): Promise<Event[]> {
    return this.trpcQuery<Event[]>('events.getHighlights', { limit: limit || 10 });
  }

  // Track event view for ranking
  async trackEventView(eventId: number): Promise<{ success: boolean }> {
    return this.trpcMutation<{ success: boolean }>('events.trackView', { eventId });
  }

  // Like event
  async likeEvent(eventId: number, userId: number): Promise<{ success: boolean; liked: boolean }> {
    return this.trpcMutation<{ success: boolean; liked: boolean }>('events.like', { eventId, userId });
  }

  // Unlike event
  async unlikeEvent(eventId: number, userId: number): Promise<{ success: boolean; liked: boolean }> {
    return this.trpcMutation<{ success: boolean; liked: boolean }>('events.unlike', { eventId, userId });
  }

  // Check if user liked event
  async isEventLiked(eventId: number, userId: number): Promise<{ liked: boolean }> {
    return this.trpcQuery<{ liked: boolean }>('events.isLiked', { eventId, userId });
  }

  // Get user's liked event IDs
  async getUserLikedEventIds(userId: number): Promise<{ eventIds: number[] }> {
    return this.trpcQuery<{ eventIds: number[] }>('events.getUserLikes', { userId });
  }

  // Share event (record share)
  async shareEvent(eventId: number, userId: number | null, platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'copy_link' | 'other' = 'other'): Promise<{ success: boolean }> {
    return this.trpcMutation<{ success: boolean }>('events.share', { eventId, userId, platform });
  }

  async getUpcomingEvents(limit?: number): Promise<Event[]> {
    return this.trpcQuery<Event[]>('events.getUpcoming', { limit });
  }

  async getEventById(id: number): Promise<Event> {
    return this.trpcQuery<Event>('events.getById', { id });
  }

  async getEvent(eventId: number): Promise<Event> {
    try {
      return await this.trpcQuery<Event>('mobile.getEvent', { id: eventId });
    } catch {
      return await this.trpcQuery<Event>('events.getById', { id: eventId });
    }
  }

  async getEventBySlug(slug: string): Promise<Event> {
    return this.trpcQuery<Event>('events.getBySlug', { slug });
  }

  async getEventCategories(eventId: number): Promise<EventCategory[]> {
    return this.trpcQuery<EventCategory[]>('events.getCategories', { eventId });
  }

  async getEventKits(eventId: number): Promise<EventKit[]> {
    return this.trpcQuery<EventKit[]>('events.getKits', { eventId });
  }

  async getEventPhotos(eventId: number): Promise<EventPhoto[]> {
    return this.trpcQuery<EventPhoto[]>('events.getPhotos', { eventId });
  }

  async getEventResults(eventId: number, categoryId?: number): Promise<any[]> {
    return this.trpcQuery('events.getResults', { eventId, categoryId });
  }

  // ==================== ORGANIZER STATS ====================

  async getOrganizerStats(): Promise<{
    paidRegistrations: number;
    pendingRegistrations: number;
    totalRevenue: number;
    totalEvents: number;
  }> {
    try {
      return await this.trpcQuery('mobile.getOrganizerStats');
    } catch {
      return { paidRegistrations: 0, pendingRegistrations: 0, totalRevenue: 0, totalEvents: 0 };
    }
  }

  // ==================== ORGANIZER METRICS ====================

  async getOrganizerMetrics(organizerId: number): Promise<{
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
  }> {
    try {
      return await this.trpcQuery('admin.getOrganizerMetrics', { organizerId });
    } catch {
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
  }

  async getOrganizerEventMetrics(organizerId: number): Promise<Array<{
    id: number;
    name: string;
    eventDate: string;
    status: string;
    registrations: number;
    paidRegistrations: number;
    revenue: number;
    views: number;
    likes: number;
    shares: number;
    occupancyRate: number;
    conversionRate: number;
  }>> {
    try {
      return await this.trpcQuery('admin.getOrganizerEventMetrics', { organizerId });
    } catch {
      return [];
    }
  }

  // ==================== CHECK-IN ====================

  async performCheckIn(registrationId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('mobile.checkIn', { registrationId });
  }

  // ==================== PAYMENT MANAGEMENT ====================

  async confirmPayment(registrationId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('mobile.confirmPayment', { registrationId });
  }

  async cancelRegistration(registrationId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('mobile.cancelRegistration', { registrationId });
  }

  // ==================== RESULTS MANAGEMENT ====================

  async publishResults(eventId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('mobile.publishResults', { eventId });
  }

  async addResult(eventId: number, data: {
    athleteName: string;
    bibNumber?: string;
    categoryName?: string;
    chipTime: string;
    gunTime?: string;
    pace?: string;
  }): Promise<{ id: number }> {
    return this.trpcMutation('mobile.addResult', { eventId, ...data });
  }

  async deleteResult(resultId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('mobile.deleteResult', { resultId });
  }

  // ==================== REGISTRATIONS ====================

  async createRegistration(data: {
    eventId: number;
    categoryId: number;
    kitId?: number;
    kitSize?: string;
  }): Promise<{
    id: number;
    checkoutToken: string;
    checkoutUrl: string | null;
    totalPrice: number;
  }> {
    return this.trpcMutation('registration.create', data);
  }

  async getMyRegistrations(): Promise<RegistrationWithDetails[]> {
    return this.trpcQuery<RegistrationWithDetails[]>('registration.getMyRegistrations');
  }

  async getRegistrationById(id: number): Promise<RegistrationWithDetails> {
    return this.trpcQuery<RegistrationWithDetails>('registration.getById', { id });
  }

  async getRegistrationByToken(token: string): Promise<RegistrationWithDetails> {
    return this.trpcQuery<RegistrationWithDetails>('registration.getByToken', { token });
  }

  // ==================== RESULTS ====================

  async getMyResults(): Promise<ResultWithDetails[]> {
    return this.trpcQuery<ResultWithDetails[]>('results.getMyResults');
  }

  async getResultById(id: number): Promise<Result> {
    return this.trpcQuery<Result>('results.getById', { id });
  }

  // ==================== TEAMS ====================

  async createTeam(data: {
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    isPublic?: boolean;
    allowJoinRequests?: boolean;
  }): Promise<{ id: number }> {
    return this.trpcMutation('team.create', data);
  }

  async updateTeam(id: number, data: {
    name?: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    primaryColor?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    isPublic?: boolean;
    allowJoinRequests?: boolean;
  }): Promise<{ success: boolean }> {
    return this.trpcMutation('team.update', { id, ...data });
  }

  async getTeamById(id: number): Promise<Team> {
    return this.trpcQuery<Team>('team.getById', { id });
  }

  async getTeamBySlug(slug: string): Promise<Team> {
    return this.trpcQuery<Team>('team.getBySlug', { slug });
  }

  async getMyTeams(userId?: number): Promise<TeamWithMembership[]> {
    // Usar endpoint mobile que aceita userId
    if (userId) {
      return this.trpcQuery<TeamWithMembership[]>('mobile.getMyTeams', { userId });
    }
    // Tentar endpoint protegido (para web)
    try {
      return await this.trpcQuery<TeamWithMembership[]>('team.getMyTeams');
    } catch {
      return [];
    }
  }

  async getTeamMembers(teamId: number): Promise<TeamMemberWithUser[]> {
    return this.trpcQuery<TeamMemberWithUser[]>('team.getMembers', { teamId });
  }

  async searchTeams(query: string, limit?: number): Promise<Team[]> {
    return this.trpcQuery<Team[]>('team.search', { query, limit });
  }

  async inviteTeamMember(data: {
    teamId: number;
    email?: string;
    userId?: number;
    role?: 'admin' | 'member';
  }): Promise<{ id: number; token: string }> {
    return this.trpcMutation('team.inviteMember', data);
  }

  async acceptTeamInvitation(token: string): Promise<{ success: boolean; teamId: number }> {
    return this.trpcMutation('team.acceptInvitation', { token });
  }

  async getMyTeamInvitations(): Promise<{ invitation: TeamInvitation; team: Team }[]> {
    return this.trpcQuery('team.getMyInvitations');
  }

  async removeTeamMember(teamId: number, userId: number): Promise<{ success: boolean }> {
    return this.trpcMutation('team.removeMember', { teamId, userId });
  }

  async updateTeamMemberRole(teamId: number, userId: number, role: 'admin' | 'member'): Promise<{ success: boolean }> {
    return this.trpcMutation('team.updateMemberRole', { teamId, userId, role });
  }

  async registerTeamForEvent(data: {
    teamId: number;
    eventId: number;
    athletes: Array<{
      userId: number;
      categoryId: number;
      kitId?: number;
      kitSize?: string;
    }>;
  }): Promise<{
    registrations: Array<{ id: number; checkoutToken: string; userId: number }>;
    totalAmount: number;
    checkoutUrl: string | null;
  }> {
    return this.trpcMutation('team.registerTeamForEvent', data);
  }

  async getTeamRegistrations(teamId: number, eventId?: number): Promise<any[]> {
    return this.trpcQuery('team.getTeamRegistrations', { teamId, eventId });
  }

  // ==================== ADMIN/ORGANIZER ====================

  async getMyEvents(): Promise<Event[]> {
    return this.trpcQuery<Event[]>('admin.getMyEvents');
  }

  async createEvent(data: {
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    eventDate: Date;
    eventTime?: string;
    city: string;
    state: string;
    eventType?: string;
    bannerUrl?: string;
    status?: 'draft' | 'published';
    organizerId?: number; // ID do organizador logado
  }): Promise<{ id: number }> {
    // Usar endpoint mobile público para criar eventos
    // organizerId é passado para associar o evento ao organizador correto
    return this.trpcMutation('mobile.createEvent', data);
  }

  async updateEvent(id: number, data: Partial<{
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    eventDate: Date;
    eventTime: string;
    city: string;
    state: string;
    eventType: string;
    bannerUrl: string;
    status: 'draft' | 'published' | 'cancelled' | 'finished';
    organizerName: string;
  }>): Promise<{ success: boolean }> {
    // Usar endpoint mobile público para atualizar eventos (não requer autenticação OAuth)
    return this.trpcMutation('mobile.updateEvent', { id, ...data });
  }

  async cancelEvent(id: number, reason: string, organizerId?: number): Promise<{
    success: boolean;
    message: string;
    totalRegistrations: number;
    refundsInitiated: number;
  }> {
    // Cancelar evento com motivo, notificações e reembolsos
    return this.trpcMutation('mobile.cancelEvent', { id, reason, organizerId });
  }

  async getEventRegistrations(eventId: number): Promise<any[]> {
    return this.trpcQuery('admin.getEventRegistrations', { eventId });
  }

  async createCategory(data: {
    eventId: number;
    name: string;
    distance?: string;
    ageGroup?: string;
    gender?: 'male' | 'female' | 'mixed';
    price: string;
    maxParticipants?: number;
  }): Promise<{ id: number }> {
    // Usar endpoint mobile público para criar categorias
    return this.trpcMutation('mobile.createCategory', data);
  }

  // Listar eventos do mobile
  async getMobileEvents(): Promise<Event[]> {
    return this.trpcQuery<Event[]>('mobile.listEvents');
  }

  // Listar eventos criados pelo organizador logado (SEGURO - usa userId da sessão)
  async getMyOrganizerEvents(userId: number): Promise<OrganizerEvent[]> {
    console.log('[API] getMyOrganizerEvents for userId:', userId);
    return this.trpcQuery<OrganizerEvent[]>('mobile.getMyOrganizerEvents', { userId });
  }

  async createKit(data: {
    eventId: number;
    name: string;
    description?: string;
    items?: string[];
    additionalPrice?: number;
    sizes?: string[];
  }): Promise<{ id: number }> {
    return this.trpcMutation('admin.createKit', data);
  }

  async addEventPhoto(data: {
    eventId: number;
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    photographer?: string;
    sortOrder?: number;
    featured?: boolean;
  }): Promise<{ id: number }> {
    return this.trpcMutation('admin.addPhoto', data);
  }

  async deleteEventPhoto(id: number): Promise<{ success: boolean }> {
    return this.trpcMutation('admin.deletePhoto', { id });
  }

  async publishResult(data: {
    registrationId: number;
    chipTime?: number;
    gunTime?: number;
    avgPace?: number;
    overallRank?: number;
    categoryRank?: number;
    genderRank?: number;
    splits?: { distance: number; time: number }[];
    status?: 'official' | 'dnf' | 'dq' | 'dns';
  }): Promise<{ id: number }> {
    return this.trpcMutation('admin.publishResult', data);
  }

  async updateResult(id: number, data: {
    chipTime?: number;
    gunTime?: number;
    avgPace?: number;
    overallRank?: number;
    categoryRank?: number;
    genderRank?: number;
    splits?: { distance: number; time: number }[];
    status?: 'official' | 'dnf' | 'dq' | 'dns';
    certificateUrl?: string;
  }): Promise<{ success: boolean }> {
    return this.trpcMutation('admin.updateResult', { id, ...data });
  }

  // Authentication methods
  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const result = await this.trpcMutation<{ success: boolean; user?: User; message?: string }>('mobile.loginUser', { email, password });
      return result;
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: error?.message || 'Erro ao fazer login' };
    }
  }

  async uploadImage(base64: string, filename: string, contentType: string = 'image/jpeg', folder: 'profiles' | 'events' | 'teams' = 'profiles'): Promise<{ success: boolean; url?: string }> {
    try {
      const result = await this.trpcMutation<{ success: boolean; url?: string }>('mobile.uploadImage', {
        base64,
        filename,
        contentType,
        folder,
      });
      return result;
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false };
    }
  }

  async registerUser(data: {
    name: string;
    email: string;
    password: string;
    cpf?: string;
    phone?: string;
    birthDate?: Date;
    gender?: 'male' | 'female' | 'other';
    photoUrl?: string;
  }): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      // Convert Date to ISO string for API
      const apiData = {
        ...data,
        birthDate: data.birthDate ? data.birthDate.toISOString() : undefined,
      };
      const result = await this.trpcMutation<{ success: boolean; userId?: number; message?: string }>('mobile.registerUser', apiData);
      return result;
    } catch (error: any) {
      console.error('Register error:', error);
      // Extract error message from tRPC error
      const message = error?.message || error?.data?.message || 'Erro ao criar conta';
      return { success: false, message };
    }
  }

  // Password Reset Methods
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.trpcMutation<{ success: boolean; message: string }>('mobile.requestPasswordReset', { email });
      return result;
    } catch (error: any) {
      console.error('Request password reset error:', error);
      const message = error?.message || 'Erro ao solicitar recuperação de senha';
      return { success: false, message };
    }
  }

  async verifyResetCode(email: string, code: string): Promise<{ success: boolean; token?: string; message?: string }> {
    try {
      const result = await this.trpcMutation<{ success: boolean; token: string }>('mobile.verifyResetCode', { email, code });
      return result;
    } catch (error: any) {
      console.error('Verify reset code error:', error);
      const message = error?.message || 'Código inválido ou expirado';
      return { success: false, message };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.trpcMutation<{ success: boolean; message: string }>('mobile.resetPassword', { token, newPassword });
      return result;
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message = error?.message || 'Erro ao redefinir senha';
      return { success: false, message };
    }
  }

  // ==================== VOUCHERS ====================
  
  async getMyVouchers(): Promise<any[]> {
    try {
      return await this.trpcQuery<any[]>('admin.getMyVouchers');
    } catch (error) {
      console.error('Get my vouchers error:', error);
      return [];
    }
  }

  async createVoucher(data: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: string;
    eventId?: number;
    maxUses?: number;
    minOrderValue?: string;
    validFrom?: Date;
    validUntil?: Date;
    description?: string;
  }): Promise<any> {
    return this.trpcMutation<any>('admin.createVoucher', data);
  }

  async updateVoucher(id: number, data: {
    code?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: string;
    maxUses?: number;
    minOrderValue?: string;
    active?: boolean;
    description?: string;
  }): Promise<{ success: boolean }> {
    return this.trpcMutation<{ success: boolean }>('admin.updateVoucher', { id, ...data });
  }

  async deleteVoucher(id: number): Promise<{ success: boolean }> {
    return this.trpcMutation<{ success: boolean }>('admin.deleteVoucher', { id });
  }

  async validateVoucher(code: string, eventId?: number, orderValue?: number): Promise<{
    valid: boolean;
    error?: string;
    voucher?: {
      id: number;
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: string;
    };
    discountAmount?: string;
  }> {
    try {
      return await this.trpcMutation<any>('mobile.validateVoucher', { code, eventId, orderValue });
    } catch (error: any) {
      return { valid: false, error: error?.message || 'Erro ao validar voucher' };
    }
  }

  // ==================== NOTIFICATIONS ====================
  
  async getNotifications(): Promise<any[]> {
    try {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user?.id) return [];
      return await this.trpcQuery<any[]>('mobileSocial.getSocialNotifications', { userId: user.id });
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  }

  async markNotificationAsRead(id: number): Promise<{ success: boolean }> {
    try {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user?.id) return { success: false };
      return await this.trpcMutation<{ success: boolean }>('mobileSocial.markNotificationAsRead', { notificationId: id, userId: user.id });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return { success: false };
    }
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    try {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user?.id) return { success: false };
      return await this.trpcMutation<{ success: boolean }>('mobileSocial.markAllNotificationsAsRead', { userId: user.id });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return { success: false };
    }
  }

  // Push Notifications
  async savePushToken(token: string, platform: string): Promise<{ success: boolean }> {
    try {
      return await this.trpcMutation<{ success: boolean }>('mobile.savePushToken', { token, platform });
    } catch (error) {
      console.error('Save push token error:', error);
      return { success: false };
    }
  }

  async removePushToken(): Promise<{ success: boolean }> {
    try {
      return await this.trpcMutation<{ success: boolean }>('mobile.removePushToken', {});
    } catch (error) {
      console.error('Remove push token error:', error);
      return { success: false };
    }
  }
}

export const api = new ApiService();
export default api;


// ============================================
// SOCIAL FEED API - Fase 3 do Roadmap
// ============================================

export interface Post {
  id: number;
  authorId: number;
  groupId: number | null;
  content: string | null;
  type: 'text' | 'photo' | 'activity' | 'announcement' | 'poll' | 'training_share';
  imageUrl: string | null;
  imageUrls: string[] | null;
  activityData: any | null;
  pollOptions: any | null;
  pollEndsAt: string | null;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'quarantine';
  isPinned: boolean;
  allowComments: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  reactions: {
    like: number;
    love: number;
    fire: number;
    clap: number;
    strong: number;
  };
  status: 'active' | 'deleted' | 'hidden';
  createdAt: string;
  updatedAt: string;
  // Joined data
  author: {
    id: number;
    name: string | null;
    photoUrl: string | null;
  };
  group: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
  isLiked: boolean;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  status: 'active' | 'deleted' | 'hidden';
  createdAt: string;
  updatedAt: string;
  // Joined data
  author: {
    id: number;
    name: string | null;
    photoUrl: string | null;
  };
  isLiked: boolean;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  state: string | null;
  privacy: 'public' | 'private';
  groupType: 'running' | 'cycling' | 'triathlon' | 'trail' | 'swimming' | 'fitness' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  memberCount: number;
  postCount: number;
  ownerId: number;
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  // Extended
  role?: 'owner' | 'admin' | 'moderator' | 'member';
  isMember?: boolean;
}

// Extend ApiService class with social methods
ApiService.prototype.getFeed = async function(options: {
  groupId?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<Post[]> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    // Use mobile endpoint which doesn't require OAuth
    return await this.trpcQuery<Post[]>('mobileSocial.socialGetFeed', {
      userId,
      ...options,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    return [];
  }
};

ApiService.prototype.createPost = async function(data: {
  content?: string;
  groupId?: number;
  type?: 'text' | 'photo' | 'activity' | 'announcement' | 'poll';
  imageUrl?: string;
  activityData?: any;
  pollData?: { options: string[] };
}): Promise<{ success: boolean; postId?: number }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    // Use mobile endpoint which doesn't require OAuth
    return await this.trpcMutation<{ success: boolean; postId: number }>('mobileSocial.createPost', {
      userId,
      ...data,
    });
  } catch (error) {
    console.error('Create post error:', error);
    return { success: false };
  }
};

ApiService.prototype.deletePost = async function(postId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    // Use mobile endpoint which doesn't require OAuth
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialDeletePost', { userId, postId });
  } catch (error) {
    console.error('Delete post error:', error);
    return { success: false };
  }
};

ApiService.prototype.likePost = async function(postId: number, reactionType: 'like' | 'love' | 'fire' | 'clap' | 'strong' = 'like', userIdParam?: number): Promise<{ success: boolean }> {
  try {
    // Get userId from parameter or stored user data
    let userId = userIdParam;
    
    if (!userId) {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      console.log('[API likePost] userData from storage:', userData ? 'found' : 'not found');
      const user = userData ? JSON.parse(userData) : null;
      userId = user?.id;
    }
    
    console.log('[API likePost] userId:', userId, 'postId:', postId, 'reactionType:', reactionType);
    
    if (!userId) {
      console.error('[API likePost] User not logged in - no userId found');
      throw new Error('Você precisa estar autenticado para realizar esta ação.');
    }
    
    const result = await this.trpcMutation<{ success: boolean }>('mobileSocial.socialLikePost', { userId, postId, reactionType });
    console.log('[API likePost] Result:', result);
    return result;
  } catch (error) {
    console.error('Like post error:', error);
    return { success: false };
  }
};

ApiService.prototype.unlikePost = async function(postId: number, userIdParam?: number): Promise<{ success: boolean }> {
  try {
    // Get userId from parameter or stored user data
    let userId = userIdParam;
    
    if (!userId) {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      console.log('[API unlikePost] userData from storage:', userData ? 'found' : 'not found');
      const user = userData ? JSON.parse(userData) : null;
      userId = user?.id;
    }
    
    console.log('[API unlikePost] userId:', userId, 'postId:', postId);
    
    if (!userId) {
      console.error('[API unlikePost] User not logged in - no userId found');
      throw new Error('Você precisa estar autenticado para realizar esta ação.');
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialUnlikePost', { userId, postId });
  } catch (error) {
    console.error('Unlike post error:', error);
    return { success: false };
  }
};

ApiService.prototype.getComments = async function(postId: number, options: {
  limit?: number;
  offset?: number;
} = {}): Promise<Comment[]> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    return await this.trpcQuery<Comment[]>('mobileSocial.socialGetComments', { userId, postId, ...options });
  } catch (error) {
    console.error('Get comments error:', error);
    return [];
  }
};

ApiService.prototype.createComment = async function(data: {
  postId: number;
  content: string;
  parentId?: number;
}): Promise<{ success: boolean; commentId?: number }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean; commentId: number }>('mobileSocial.socialCreateComment', { userId, ...data });
  } catch (error) {
    console.error('Create comment error:', error);
    return { success: false };
  }
};

ApiService.prototype.deleteComment = async function(commentId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    // Use mobile endpoint which doesn't require OAuth
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialDeleteComment', { userId, commentId });
  } catch (error) {
    console.error('Delete comment error:', error);
    return { success: false };
  }
};

ApiService.prototype.likeComment = async function(commentId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialLikeComment', { userId, commentId });
  } catch (error) {
    console.error('Like comment error:', error);
    return { success: false };
  }
};

ApiService.prototype.unlikeComment = async function(commentId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialUnlikeComment', { userId, commentId });
  } catch (error) {
    console.error('Unlike comment error:', error);
    return { success: false };
  }
};

ApiService.prototype.reportContent = async function(data: {
  targetType: 'post' | 'comment' | 'user' | 'group';
  targetId: number;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity' | 'false_information' | 'copyright' | 'other';
  description?: string;
}): Promise<{ success: boolean; reportId?: number }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean; reportId: number }>('mobileSocial.socialReportContent', { userId, ...data });
  } catch (error) {
    console.error('Report content error:', error);
    return { success: false };
  }
};

ApiService.prototype.savePost = async function(postId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialSavePost', { userId, postId });
  } catch (error) {
    console.error('Save post error:', error);
    return { success: false };
  }
};

ApiService.prototype.unsavePost = async function(postId: number): Promise<{ success: boolean }> {
  try {
    // Get userId from stored user data
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return { success: false };
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialUnsavePost', { userId, postId });
  } catch (error) {
    console.error('Unsave post error:', error);
    return { success: false };
  }
};

ApiService.prototype.sharePost = async function(postId: number): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.socialSharePost', { postId });
  } catch (error) {
    console.error('Share post error:', error);
    return { success: false };
  }
};

// Get saved posts
ApiService.prototype.getSavedPosts = async function(limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      console.error('User not logged in');
      return [];
    }
    
    return await this.trpcQuery<any[]>('mobileSocial.getSavedPosts', { userId, limit, offset });
  } catch (error) {
    console.error('Get saved posts error:', error);
    return [];
  }
};

// Groups
ApiService.prototype.getUserGroups = async function(): Promise<Group[]> {
  try {
    return await this.trpcQuery<Group[]>('groups.list', {});
  } catch (error) {
    console.error('Get user groups error:', error);
    return [];
  }
};

ApiService.prototype.getGroup = async function(groupId: number): Promise<Group | null> {
  try {
    return await this.trpcQuery<Group>('groups.get', { groupId });
  } catch (error) {
    console.error('Get group error:', error);
    return null;
  }
};

ApiService.prototype.createGroup = async function(data: {
  name: string;
  description?: string;
  privacy?: 'public' | 'private';
  groupType?: 'running' | 'cycling' | 'triathlon' | 'trail' | 'swimming' | 'fitness' | 'other';
  city?: string;
  state?: string;
  meetingPoint?: string;
  requiresApproval?: boolean;
}): Promise<{ success: boolean; groupId?: number }> {
  try {
    return await this.trpcMutation<{ success: boolean; groupId: number }>('groups.create', data);
  } catch (error) {
    console.error('Create group error:', error);
    return { success: false };
  }
};

ApiService.prototype.joinGroup = async function(groupId: number): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('groups.join', { groupId });
  } catch (error) {
    console.error('Join group error:', error);
    return { success: false };
  }
};

ApiService.prototype.leaveGroup = async function(groupId: number): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('groups.leave', { groupId });
  } catch (error) {
    console.error('Leave group error:', error);
    return { success: false };
  }
};

// Type declarations for the extended methods
declare module './api' {
  interface ApiService {
    getFeed(options?: { groupId?: number; limit?: number; offset?: number }): Promise<Post[]>;
    createPost(data: { content?: string; groupId?: number; type?: string; imageUrl?: string; activityData?: any }): Promise<{ success: boolean; postId?: number }>;
    deletePost(postId: number): Promise<{ success: boolean }>;
    likePost(postId: number, reactionType?: string, userId?: number): Promise<{ success: boolean }>;
    unlikePost(postId: number, userId?: number): Promise<{ success: boolean }>;
    getComments(postId: number, options?: { limit?: number; offset?: number }): Promise<Comment[]>;
    createComment(data: { postId: number; content: string; parentId?: number }): Promise<{ success: boolean; commentId?: number }>;
    deleteComment(commentId: number): Promise<{ success: boolean }>;
    likeComment(commentId: number): Promise<{ success: boolean }>;
    unlikeComment(commentId: number): Promise<{ success: boolean }>;
    reportContent(data: { targetType: string; targetId: number; reason: string; description?: string }): Promise<{ success: boolean; reportId?: number }>;
    getUserGroups(): Promise<Group[]>;
    getGroup(groupId: number): Promise<Group | null>;
    createGroup(data: any): Promise<{ success: boolean; groupId?: number }>;
    joinGroup(groupId: number): Promise<{ success: boolean }>;
    leaveGroup(groupId: number): Promise<{ success: boolean }>;
  }
}


// ==================== MEDIA UPLOAD ====================
// SDK 54 FIX: Usar expo-file-system/legacy para compatibilidade
// IMPORTANTE: NÃO alterar nada de áudio/vídeo export - apenas filesystem/URI/metadata

/**
 * Importa FileSystem do módulo legacy para SDK 54
 * Resolve erro: "Method getInfoAsync imported from 'expo-file-system' is deprecated"
 */
function getFileSystemLegacy() {
  try {
    // Tentar importar do módulo legacy primeiro (SDK 54+)
    const LegacyFS = require('expo-file-system/legacy');
    console.log('[Upload] ✅ Usando expo-file-system/legacy (SDK 54+)');
    return LegacyFS;
  } catch (e) {
    // Fallback para módulo padrão (SDK < 54)
    const StandardFS = require('expo-file-system');
    console.log('[Upload] ⚠️ Fallback para expo-file-system padrão');
    return StandardFS;
  }
}

/**
 * Normaliza URI de mídia para formato compatível com FileSystem
 * Converte ph://, assets-library://, content:// para file://
 * SDK 54 FIX: Usa expo-file-system/legacy e nunca crasha
 */
async function normalizeMediaUri(uri: string): Promise<string> {
  console.log('[Upload] 🔄 URI Original:', uri);
  
  // Validação básica - nunca acessar propriedades de undefined
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    console.error('[Upload] ❌ URI inválida ou vazia');
    throw new Error('URI inválida ou não fornecida');
  }
  
  const trimmedUri = uri.trim();
  
  // Se já é file://, retorna direto
  if (trimmedUri.startsWith('file://')) {
    console.log('[Upload] ✅ URI já é file://');
    return trimmedUri;
  }
  
  // Se é URI do iOS (ph:// ou assets-library://), precisa copiar para sandbox
  if (trimmedUri.startsWith('ph://') || trimmedUri.startsWith('assets-library://')) {
    console.log('[Upload] 📱 URI do iOS detectada, exportando para cache...');
    try {
      const FileSystem = getFileSystemLegacy();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      // Extrair extensão de forma segura
      let extension = 'jpg';
      try {
        if (trimmedUri.includes('.')) {
          const parts = trimmedUri.split('.');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            extension = lastPart.split('?')[0]?.toLowerCase() || 'jpg';
          }
        }
      } catch (extError) {
        console.log('[Upload] ⚠️ Não foi possível extrair extensão, usando jpg');
      }
      
      // Garantir que cacheDirectory existe
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      if (!cacheDir) {
        throw new Error('Diretório de cache não disponível');
      }
      
      const localUri = `${cacheDir}media_${timestamp}_${random}.${extension}`;
      console.log('[Upload] 📁 Destino:', localUri);
      
      await FileSystem.copyAsync({
        from: trimmedUri,
        to: localUri,
      });
      
      console.log('[Upload] ✅ Copiado com sucesso para:', localUri);
      return localUri;
    } catch (copyError: any) {
      console.error('[Upload] ❌ Erro ao copiar URI do iOS:', copyError?.message || copyError);
      // Tentar usar URI original como fallback
      console.log('[Upload] ⚠️ Tentando usar URI original como fallback');
      return trimmedUri;
    }
  }
  
  // Se é URI do Android (content://), precisa copiar para sandbox
  if (trimmedUri.startsWith('content://')) {
    console.log('[Upload] 🤖 URI do Android detectada, exportando para cache...');
    try {
      const FileSystem = getFileSystemLegacy();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      
      // Extrair extensão de forma segura
      let extension = 'jpg';
      try {
        if (trimmedUri.includes('.')) {
          const parts = trimmedUri.split('.');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            extension = lastPart.split('?')[0]?.toLowerCase() || 'jpg';
          }
        }
      } catch (extError) {
        console.log('[Upload] ⚠️ Não foi possível extrair extensão, usando jpg');
      }
      
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      if (!cacheDir) {
        throw new Error('Diretório de cache não disponível');
      }
      
      const localUri = `${cacheDir}media_${timestamp}_${random}.${extension}`;
      console.log('[Upload] 📁 Destino:', localUri);
      
      await FileSystem.copyAsync({
        from: trimmedUri,
        to: localUri,
      });
      
      console.log('[Upload] ✅ Copiado com sucesso para:', localUri);
      return localUri;
    } catch (copyError: any) {
      console.error('[Upload] ❌ Erro ao copiar URI do Android:', copyError?.message || copyError);
      // Tentar usar URI original como fallback
      console.log('[Upload] ⚠️ Tentando usar URI original como fallback');
      return trimmedUri;
    }
  }
  
  // Para outros casos (http://, https://, data:, etc), tenta usar direto
  console.log('[Upload] ℹ️ Usando URI original:', trimmedUri);
  return trimmedUri;
}

/**
 * Carrega e valida metadata da mídia antes do upload
 * SDK 54 FIX: Usa expo-file-system/legacy e nunca crasha
 * Se getInfoAsync falhar, permite upload com metadata parcial
 */
async function loadMediaMetadata(uri: string): Promise<{
  uri: string;
  fileSize: number;
  exists: boolean;
  metadataAvailable: boolean;
}> {
  console.log('[Upload] 📊 Carregando metadata para:', uri);
  
  // Validação de entrada
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    console.error('[Upload] ❌ URI inválida para metadata');
    return {
      uri: uri || '',
      fileSize: 0,
      exists: false,
      metadataAvailable: false,
    };
  }
  
  const FileSystem = getFileSystemLegacy();
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    // Null-check de todas as propriedades
    const exists = fileInfo?.exists === true;
    const size = typeof fileInfo?.size === 'number' ? fileInfo.size : 0;
    
    if (!exists) {
      console.warn('[Upload] ⚠️ Arquivo não encontrado via getInfoAsync, mas permitindo upload');
      // NÃO bloquear upload - permitir com metadata parcial
      return {
        uri: uri,
        fileSize: 0,
        exists: false,
        metadataAvailable: false,
      };
    }
    
    console.log('[Upload] ✅ Metadata:', { exists, size });
    
    return {
      uri: uri,
      fileSize: size,
      exists: exists,
      metadataAvailable: true,
    };
  } catch (error: any) {
    // SDK 54 FIX: Se getInfoAsync falhar, NÃO bloquear o upload
    console.warn('[Upload] ⚠️ getInfoAsync falhou:', error?.message || error);
    console.log('[Upload] ℹ️ Permitindo upload com metadata parcial (URI parece válida)');
    
    // Retornar metadata parcial em vez de crashar
    return {
      uri: uri,
      fileSize: 0,
      exists: true, // Assumir que existe se a URI parece válida
      metadataAvailable: false,
    };
  }
}

ApiService.prototype.uploadMedia = async function(imageUri: string, purpose: string = 'post'): Promise<{
  success: boolean;
  url?: string;
  uploadId?: number;
  status?: 'pending' | 'approved' | 'rejected';
  error?: string;
}> {
  // LOG OBRIGATÓRIO: URI original
  console.log('[Upload] 🚀 Iniciando upload');
  console.log('[Upload] 📍 URI Original:', imageUri);
  console.log('[Upload] 🎯 Purpose:', purpose);
  
  try {
    // PASSO 1: Validar URI de entrada
    if (!imageUri || typeof imageUri !== 'string' || imageUri.trim() === '') {
      console.error('[Upload] ❌ FALHA FILESYSTEM: URI inválida ou vazia');
      return { success: false, error: 'URI de mídia inválida' };
    }
    
    // PASSO 2: Normalizar URI (converter ph://, assets-library://, content:// para file://)
    let normalizedUri: string;
    try {
      normalizedUri = await normalizeMediaUri(imageUri);
      // LOG OBRIGATÓRIO: URI final usada no upload
      console.log('[Upload] 📍 URI Final (normalizada):', normalizedUri);
    } catch (normalizeError: any) {
      console.error('[Upload] ❌ FALHA FILESYSTEM: Erro na normalização -', normalizeError?.message || normalizeError);
      return { success: false, error: normalizeError.message || 'Erro ao processar mídia' };
    }
    
    // PASSO 3: Carregar e validar metadata (SDK 54 FIX: não bloqueia se falhar)
    let metadata;
    try {
      metadata = await loadMediaMetadata(normalizedUri);
      // LOG OBRIGATÓRIO: Resultado do getInfoAsync
      console.log('[Upload] 📊 Metadata:', {
        exists: metadata.exists,
        fileSize: metadata.fileSize,
        metadataAvailable: metadata.metadataAvailable
      });
    } catch (metadataError: any) {
      // SDK 54 FIX: NÃO bloquear upload se metadata falhar
      console.warn('[Upload] ⚠️ Metadata indisponível, continuando upload:', metadataError?.message);
      metadata = { uri: normalizedUri, fileSize: 0, exists: true, metadataAvailable: false };
    }
    
    // PASSO 4: Ler arquivo como base64 (SDK 54 FIX: usar legacy)
    const FileSystem = getFileSystemLegacy();
    let base64: string;
    try {
      base64 = await FileSystem.readAsStringAsync(normalizedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      if (!base64 || base64.length === 0) {
        console.error('[Upload] ❌ FALHA FILESYSTEM: Arquivo vazio ou não legível');
        throw new Error('Arquivo vazio');
      }
      
      console.log('[Upload] ✅ Base64 gerado, tamanho:', base64.length, 'chars');
    } catch (readError: any) {
      console.error('[Upload] ❌ FALHA FILESYSTEM: Erro ao ler arquivo -', readError?.message || readError);
      return { success: false, error: 'Não foi possível ler o arquivo de mídia' };
    }
    
    // PASSO 5: Extrair nome do arquivo e tipo
    const filename = normalizedUri.split('/').pop() || `${purpose}-${Date.now()}.jpg`;
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const isVideo = ['mp4', 'mov', 'avi', 'webm', 'm4v'].includes(extension);
    const contentType = isVideo ? `video/${extension === 'mov' ? 'quicktime' : extension}` : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    
    console.log('[Upload] 📄 Arquivo:', { filename, extension, contentType, isVideo });
    
    // PASSO 6: Determinar pasta de destino
    const folderMap: Record<string, 'profiles' | 'events' | 'teams'> = {
      'post': 'events',
      'profile': 'profiles',
      'group': 'teams',
      'event': 'events',
      'story': 'events',
    };
    const folder = folderMap[purpose] || 'events';
    
    // PASSO 7: Fazer upload via tRPC
    console.log('[Upload] 🌐 Enviando para servidor...');
    console.log('[Upload] 📦 Payload:', { filename, contentType, folder, base64Length: base64.length });
    
    try {
      const result = await this.trpcMutation<{ success: boolean; url: string }>('mobile.uploadImage', {
        base64,
        filename,
        contentType,
        folder,
      });
      
      if (result && result.success && result.url) {
        console.log('[Upload] ✅ SUCESSO! URL:', result.url);
        return {
          success: true,
          url: result.url,
          status: 'approved', // Com MODERATION_REQUIRED=false, aprova direto
        };
      } else {
        console.error('[Upload] ❌ FALHA REDE: Servidor retornou falha -', result);
        return { success: false, error: 'Servidor não retornou URL' };
      }
    } catch (uploadError: any) {
      // LOG OBRIGATÓRIO: Diferenciar falha de rede vs outras
      const errorMsg = uploadError?.message || 'Erro desconhecido';
      if (errorMsg.includes('Network') || errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        console.error('[Upload] ❌ FALHA REDE: Erro de conexão -', errorMsg);
      } else {
        console.error('[Upload] ❌ FALHA SERVIDOR: Erro no upload -', errorMsg);
      }
      return { success: false, error: errorMsg };
    }
    
  } catch (error: any) {
    // Fallback para qualquer erro não tratado
    console.error('[Upload] ❌ ERRO INESPERADO:', error?.message || error);
    return { success: false, error: error?.message || 'Erro desconhecido no upload' };
  }
};

ApiService.prototype.checkMediaStatus = async function(uploadId: number): Promise<{
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}> {
  try {
    return await this.trpcQuery<{ status: 'pending' | 'approved' | 'rejected'; reason?: string }>('social.checkMediaStatus', { uploadId });
  } catch (error) {
    console.error('Check media status error:', error);
    return { status: 'pending' };
  }
};

// Add to type declarations
declare module './api' {
  interface ApiService {
    uploadMedia(imageUri: string, purpose?: string): Promise<{ success: boolean; url?: string; uploadId?: number; status?: string; error?: string }>;
    checkMediaStatus(uploadId: number): Promise<{ status: string; reason?: string }>;
  }
}


// ============================================
// Profile Grid Methods
// ============================================

ApiService.prototype.getAthleteProfile = async function(userId: number): Promise<{
  profile: {
    id: number;
    name: string;
    photoUrl: string | null;
    bio: string | null;
    gridBio: string | null;
    city: string | null;
    state: string | null;
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
}> {
  try {
    return await this.trpcQuery<any>('mobileSocial.getAthleteProfile', { userId });
  } catch (error) {
    console.error('Get athlete profile error:', error);
    throw error;
  }
};

ApiService.prototype.checkUsernameAvailable = async function(username: string): Promise<{ available: boolean; normalizedUsername: string }> {
  try {
    return await this.trpcQuery<{ available: boolean; normalizedUsername: string }>('mobileSocial.checkUsernameAvailable', { username });
  } catch (error) {
    console.error('Check username error:', error);
    throw error;
  }
};

ApiService.prototype.suggestUsername = async function(name: string): Promise<{ suggestion: string }> {
  try {
    return await this.trpcQuery<{ suggestion: string }>('mobileSocial.suggestUsername', { name });
  } catch (error) {
    console.error('Suggest username error:', error);
    throw error;
  }
};

ApiService.prototype.followUser = async function(targetUserId: number): Promise<{ success: boolean }> {
  try {
    // Get current user ID from storage
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.followUser', { userId, targetUserId });
  } catch (error) {
    console.error('Follow user error:', error);
    throw error;
  }
};

ApiService.prototype.unfollowUser = async function(targetUserId: number): Promise<{ success: boolean }> {
  try {
    // Get current user ID from storage
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    const userId = user?.id;
    
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.unfollowUser', { userId, targetUserId });
  } catch (error) {
    console.error('Unfollow user error:', error);
    throw error;
  }
};

ApiService.prototype.updateGridBio = async function(gridBio: string): Promise<{ success: boolean }> {
  try {
    // Obter userId do storage - tentar ambas as chaves
    let userJson = await AsyncStorage.getItem('@souesporte_user');
    if (!userJson) {
      userJson = await AsyncStorage.getItem('user');
    }
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user?.id) {
      throw new Error('User not logged in');
    }
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.updateGridBio', { userId: user.id, gridBio });
  } catch (error) {
    console.error('Update grid bio error:', error);
    throw error;
  }
};

// Update grid profile with all fields
ApiService.prototype.updateGridProfile = async function(data: {
  gridBio?: string;
  city?: string;
  state?: string;
  country?: string;
  athleteCategory?: 'PRO' | 'AMATEUR' | 'COACH' | 'profissional' | 'amador' | 'instrutor';
  sports?: string[];
}): Promise<{ success: boolean }> {
  try {
    // Obter userId do storage
    let userJson = await AsyncStorage.getItem('@souesporte_user');
    if (!userJson) {
      userJson = await AsyncStorage.getItem('user');
    }
    const user = userJson ? JSON.parse(userJson) : null;
    if (!user?.id) {
      throw new Error('User not logged in');
    }
    
    // Mapear categoria para valores do banco de dados (aceita ambos formatos)
    const categoryMap: Record<string, string> = {
      'profissional': 'PRO',
      'amador': 'AMATEUR',
      'instrutor': 'COACH',
      'PRO': 'PRO',
      'AMATEUR': 'AMATEUR',
      'COACH': 'COACH',
    };
    
    const mappedData = {
      ...data,
      athleteCategory: data.athleteCategory ? categoryMap[data.athleteCategory] : undefined,
    };
    
    console.log('[API] updateGridProfile sending:', { userId: user.id, ...mappedData });
    
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.updateGridProfile', { userId: user.id, ...mappedData });
  } catch (error) {
    console.error('Update grid profile error:', error);
    throw error;
  }
};

ApiService.prototype.getFollowers = async function(userId: number, limit: number = 20, offset: number = 0, currentUserId?: number): Promise<{ users: any[]; total: number }> {
  try {
    // Se currentUserId não for passado, tentar obter do storage
    let currentUser = currentUserId;
    if (!currentUser) {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      currentUser = user?.id;
    }
    return await this.trpcQuery<{ users: any[]; total: number }>('mobileSocial.getFollowers', { userId, currentUserId: currentUser, limit, offset });
  } catch (error) {
    console.error('Get followers error:', error);
    throw error;
  }
};

ApiService.prototype.getFollowing = async function(userId: number, limit: number = 20, offset: number = 0, currentUserId?: number): Promise<{ users: any[]; total: number }> {
  try {
    // Se currentUserId não for passado, tentar obter do storage
    let currentUser = currentUserId;
    if (!currentUser) {
      const userData = await AsyncStorage.getItem('@souesporte_user');
      const user = userData ? JSON.parse(userData) : null;
      currentUser = user?.id;
    }
    return await this.trpcQuery<{ users: any[]; total: number }>('mobileSocial.getFollowing', { userId, currentUserId: currentUser, limit, offset });
  } catch (error) {
    console.error('Get following error:', error);
    throw error;
  }
};

ApiService.prototype.getPostDetail = async function(postId: number): Promise<any> {
  try {
    return await this.trpcQuery<any>('mobileSocial.getPostDetail', { postId });
  } catch (error) {
    console.error('Get post detail error:', error);
    throw error;
  }
};

// likePost and unlikePost are defined above with proper userId handling (lines 1306-1357)

// savePost and unsavePost are defined above with proper userId handling;

ApiService.prototype.sharePost = async function(postId: number): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.sharePost', { postId });
  } catch (error) {
    console.error('Share post error:', error);
    throw error;
  }
};

ApiService.prototype.searchAthletes = async function(query: string, currentUserId?: number): Promise<any[]> {
  try {
    return await this.trpcQuery<any[]>('mobileSocial.searchAthletes', { query, currentUserId });
  } catch (error) {
    console.error('Search athletes error:', error);
    return [];
  }
};

ApiService.prototype.getAthleteGridProfile = async function(userId: number, currentUserId?: number): Promise<any> {
  try {
    return await this.trpcQuery<any>('mobileSocial.getAthleteProfile', { userId, currentUserId });
  } catch (error) {
    console.error('Get athlete grid profile error:', error);
    throw error;
  }
};

// updateGridProfile já definido acima com mapeamento de categoria

ApiService.prototype.getSuggestedUsers = async function(data: { userId: number; limit?: number }): Promise<{ users: any[] }> {
  try {
    return await this.trpcQuery<{ users: any[] }>('mobileSocial.getSuggestedUsers', data);
  } catch (error) {
    console.error('Get suggested users error:', error);
    return { users: [] };
  }
};

ApiService.prototype.getOrCreateChatThread = async function(data: { userId: number; otherUserId: number }): Promise<{ threadId: number }> {
  try {
    return await this.trpcMutation<{ threadId: number }>('mobileSocial.getOrCreateChatThread', data);
  } catch (error) {
    console.error('Get or create chat thread error:', error);
    throw error;
  }
};

ApiService.prototype.getChatMessages = async function(data: { threadId: number; limit?: number; offset?: number }): Promise<{ messages: any[] }> {
  try {
    return await this.trpcQuery<{ messages: any[] }>('mobileSocial.getChatMessages', data);
  } catch (error) {
    console.error('Get chat messages error:', error);
    return { messages: [] };
  }
};

ApiService.prototype.sendChatMessage = async function(data: { threadId: number; senderId: number; content: string }): Promise<{ success: boolean; messageId: number }> {
  try {
    return await this.trpcMutation<{ success: boolean; messageId: number }>('mobileSocial.sendChatMessage', data);
  } catch (error) {
    console.error('Send chat message error:', error);
    throw error;
  }
};

// Safe chat methods with mutual follow check
ApiService.prototype.getOrCreateChatThreadSafe = async function(data: { userId: number; otherUserId: number }): Promise<{ threadId?: number; error?: string }> {
  try {
    return await this.trpcMutation<{ threadId?: number; error?: string }>('mobileSocial.getOrCreateChatThreadSafe', data);
  } catch (error) {
    console.error('Get or create chat thread safe error:', error);
    return { error: 'Erro ao iniciar conversa' };
  }
};

ApiService.prototype.sendChatMessageSafe = async function(data: { threadId: number; senderId: number; content: string }): Promise<{ success?: boolean; messageId?: number; error?: string }> {
  try {
    return await this.trpcMutation<{ success?: boolean; messageId?: number; error?: string }>('mobileSocial.sendChatMessageSafe', data);
  } catch (error) {
    console.error('Send chat message safe error:', error);
    return { error: 'Erro ao enviar mensagem' };
  }
};

ApiService.prototype.markMessagesAsRead = async function(data: { threadId: number; userId: number }): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.markMessagesAsRead', data);
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return { success: false };
  }
};

ApiService.prototype.getUserChatThreads = async function(data: { userId: number }): Promise<{ threads: any[] }> {
  try {
    return await this.trpcQuery<{ threads: any[] }>('mobileSocial.getUserChatThreads', data);
  } catch (error) {
    console.error('Get user chat threads error:', error);
    return { threads: [] };
  }
};

// Safety features
ApiService.prototype.blockUser = async function(data: { blockerId: number; blockedId: number; reason?: string }): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.blockUser', data);
  } catch (error) {
    console.error('Block user error:', error);
    throw error;
  }
};

ApiService.prototype.unblockUser = async function(data: { blockerId: number; blockedId: number }): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.unblockUser', data);
  } catch (error) {
    console.error('Unblock user error:', error);
    throw error;
  }
};

ApiService.prototype.reportContent = async function(data: { reporterId: number; reportedUserId?: number; reportedPostId?: number; reportedMessageId?: number; reason: string; description?: string }): Promise<{ success: boolean }> {
  try {
    return await this.trpcMutation<{ success: boolean }>('mobileSocial.reportContent', data);
  } catch (error) {
    console.error('Report content error:', error);
    throw error;
  }
};

ApiService.prototype.isUserBlocked = async function(data: { userId: number; targetUserId: number }): Promise<{ isBlocked: boolean }> {
  try {
    return await this.trpcQuery<{ isBlocked: boolean }>('mobileSocial.isUserBlocked', data);
  } catch (error) {
    console.error('Is user blocked error:', error);
    return { isBlocked: false };
  }
};

ApiService.prototype.getBlockedUsers = async function(data: { userId: number }): Promise<{ blockedUsers: any[] }> {
  try {
    return await this.trpcQuery<{ blockedUsers: any[] }>('mobileSocial.getBlockedUsers', data);
  } catch (error) {
    console.error('Get blocked users error:', error);
    return { blockedUsers: [] };
  }
};

// ==================== PARTE 1: CHAT ADVANCED METHODS ====================

ApiService.prototype.deleteThreadForMe = async function(data: { threadId: number; userId: number }) {
  return this.trpcMutation('mobileSocial.deleteThreadForMe', data);
};

ApiService.prototype.getUserChatThreadsFiltered = async function(data: { userId: number }) {
  return this.trpcQuery('mobileSocial.getUserChatThreadsFiltered', data);
};

ApiService.prototype.addMessageReaction = async function(data: { messageId: number; userId: number; emoji: string }) {
  return this.trpcMutation('mobileSocial.addMessageReaction', data);
};

ApiService.prototype.removeMessageReaction = async function(data: { messageId: number; userId: number }) {
  return this.trpcMutation('mobileSocial.removeMessageReaction', data);
};

ApiService.prototype.deleteChatMessage = async function(data: { messageId: number; userId: number }) {
  return this.trpcMutation('mobileSocial.deleteChatMessage', data);
};

ApiService.prototype.sendChatMessageWithReply = async function(data: { threadId: number; senderId: number; content: string; replyToMessageId?: number }) {
  return this.trpcMutation('mobileSocial.sendChatMessageWithReply', data);
};

ApiService.prototype.getChatMessagesWithDetails = async function(data: { threadId: number; limit?: number; offset?: number }) {
  return this.trpcQuery('mobileSocial.getChatMessagesWithDetails', data);
};

// ==================== PARTE 2: FEED LIKES METHODS ====================

ApiService.prototype.getPostLikes = async function(data: { postId: number; limit?: number; offset?: number }) {
  return this.trpcQuery('mobileSocial.getPostLikes', data);
};

ApiService.prototype.getRecentLikers = async function(data: { postId: number; limit?: number }) {
  return this.trpcQuery('mobileSocial.getRecentLikers', data);
};

ApiService.prototype.searchAthletesTypeahead = async function(data: { userId: number; query: string; limit?: number }) {
  return this.trpcQuery('mobileSocial.searchAthletesTypeahead', data);
};

// ==================== PARTE 3: FOLLOW WITH APPROVAL METHODS ====================

ApiService.prototype.followRequest = async function(data: { followerId: number; followingId: number }) {
  return this.trpcMutation('mobileSocial.followRequest', data);
};

ApiService.prototype.cancelFollowRequest = async function(data: { followerId: number; followingId: number }) {
  return this.trpcMutation('mobileSocial.cancelFollowRequest', data);
};

ApiService.prototype.acceptFollowRequest = async function(data: { userId: number; followerId: number }) {
  return this.trpcMutation('mobileSocial.acceptFollowRequest', data);
};

ApiService.prototype.declineFollowRequest = async function(data: { userId: number; followerId: number }) {
  return this.trpcMutation('mobileSocial.declineFollowRequest', data);
};

ApiService.prototype.unfollowUserAdvanced = async function(data: { followerId: number; followingId: number }) {
  return this.trpcMutation('mobileSocial.unfollowUser', data);
};

ApiService.prototype.getFollowRequestsInbox = async function(data: { userId: number }) {
  return this.trpcQuery('mobileSocial.getFollowRequestsInbox', data);
};

ApiService.prototype.getFollowStatus = async function(data: { followerId: number; followingId: number }) {
  return this.trpcQuery('mobileSocial.getFollowStatus', data);
};

ApiService.prototype.getFollowNotifications = async function(data: { userId: number }) {
  return this.trpcQuery('mobileSocial.getFollowNotifications', data);
};

ApiService.prototype.markFollowNotificationsRead = async function(data: { userId: number }) {
  return this.trpcMutation('mobileSocial.markFollowNotificationsRead', data);
};

// ==================== SOCIAL NOTIFICATIONS METHODS ====================

ApiService.prototype.getSocialNotifications = async function(limit: number = 50) {
  try {
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    if (!user?.id) return [];
    return this.trpcQuery('mobileSocial.getSocialNotifications', { userId: user.id, limit });
  } catch (error) {
    console.error('Get social notifications error:', error);
    return [];
  }
};

ApiService.prototype.markSocialNotificationRead = async function(id: number) {
  try {
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    if (!user?.id) return { success: false };
    return this.trpcMutation('mobileSocial.markNotificationAsRead', { notificationId: id, userId: user.id });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return { success: false };
  }
};

ApiService.prototype.markAllSocialNotificationsRead = async function() {
  try {
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    if (!user?.id) return { success: false };
    return this.trpcMutation('mobileSocial.markAllNotificationsAsRead', { userId: user.id });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return { success: false };
  }
};

ApiService.prototype.getUnreadSocialNotificationsCount = async function() {
  try {
    const userData = await AsyncStorage.getItem('@souesporte_user');
    const user = userData ? JSON.parse(userData) : null;
    if (!user?.id) return 0;
    return this.trpcQuery('mobileSocial.getUnreadNotificationsCount', { userId: user.id });
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

// ==================== TRAININGS API ====================

ApiService.prototype.getTrainings = async function(filters?: { groupId?: number; status?: string; limit?: number }) {
  try {
    return await this.trpcQuery('trainings.list', filters || {});
  } catch (error) {
    console.error('Get trainings error:', error);
    return [];
  }
};

ApiService.prototype.getTrainingById = async function(trainingId: number) {
  try {
    return await this.trpcQuery('trainings.getById', { trainingId });
  } catch (error) {
    console.error('Get training by id error:', error);
    return null;
  }
};

ApiService.prototype.getMyTrainings = async function() {
  try {
    return await this.trpcQuery('trainings.myTrainings', {});
  } catch (error) {
    console.error('Get my trainings error:', error);
    return [];
  }
};

ApiService.prototype.getNearbyTrainings = async function(lat: number, lng: number, radiusKm?: number) {
  try {
    return await this.trpcQuery('trainings.nearby', { lat, lng, radiusKm });
  } catch (error) {
    console.error('Get nearby trainings error:', error);
    return [];
  }
};

ApiService.prototype.createTraining = async function(data: {
  groupId: number;
  title: string;
  description?: string;
  trainingType: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingPoint?: string;
  meetingLat?: number;
  meetingLng?: number;
  maxParticipants?: number;
}) {
  try {
    return await this.trpcMutation('trainings.create', data);
  } catch (error) {
    console.error('Create training error:', error);
    return { success: false };
  }
};

ApiService.prototype.joinTraining = async function(trainingId: number, response: 'going' | 'maybe' | 'not_going') {
  try {
    return await this.trpcMutation('trainings.join', { trainingId, response });
  } catch (error) {
    console.error('Join training error:', error);
    return { success: false };
  }
};

// Add to type declarations
declare module './api' {
  interface ApiService {
    // Trainings
    getTrainings(filters?: { groupId?: number; status?: string; limit?: number }): Promise<any[]>;
    getTrainingById(trainingId: number): Promise<any | null>;
    getMyTrainings(): Promise<any[]>;
    getNearbyTrainings(lat: number, lng: number, radiusKm?: number): Promise<any[]>;
    createTraining(data: { groupId: number; title: string; description?: string; trainingType: string; scheduledAt: string; durationMinutes?: number; meetingPoint?: string; meetingLat?: number; meetingLng?: number; maxParticipants?: number }): Promise<{ id?: number; success: boolean }>;
    joinTraining(trainingId: number, response: 'going' | 'maybe' | 'not_going'): Promise<{ success: boolean }>;
    // Existing methods
    getAthleteProfile(userId: number): Promise<{
      profile: {
        id: number;
        name: string;
        photoUrl: string | null;
        bio: string | null;
        gridBio: string | null;
        city: string | null;
        state: string | null;
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
    }>;
    checkUsernameAvailable(username: string): Promise<{ available: boolean; normalizedUsername: string }>;
    suggestUsername(name: string): Promise<{ suggestion: string }>;
    followUser(userId: number): Promise<{ success: boolean }>;
    unfollowUser(userId: number): Promise<{ success: boolean }>;
    updateGridBio(gridBio: string): Promise<{ success: boolean }>;
    getFollowers(userId: number, limit?: number, offset?: number): Promise<{ users: any[]; total: number }>;
    getFollowing(userId: number, limit?: number, offset?: number): Promise<{ users: any[]; total: number }>;
    getPostDetail(postId: number): Promise<any>;
    likePost(postId: number): Promise<{ success: boolean }>;
    unlikePost(postId: number): Promise<{ success: boolean }>;
    savePost(postId: number): Promise<{ success: boolean }>;
    unsavePost(postId: number): Promise<{ success: boolean }>;
    sharePost(postId: number): Promise<{ success: boolean }>;
    searchAthletes(query: string, currentUserId?: number): Promise<any[]>;
    getAthleteGridProfile(userId: number, currentUserId?: number): Promise<any>;
    updateGridProfile(data: { userId: number; gridBio: string; sports: string[] }): Promise<{ success: boolean }>;
    getSuggestedUsers(data: { userId: number; limit?: number }): Promise<{ users: any[] }>;
    getOrCreateChatThread(data: { userId: number; otherUserId: number }): Promise<{ threadId: number }>;
    getChatMessages(data: { threadId: number; limit?: number; offset?: number }): Promise<{ messages: any[] }>;
    sendChatMessage(data: { threadId: number; senderId: number; content: string }): Promise<{ success: boolean; messageId: number }>;
    // Safe chat methods
    getOrCreateChatThreadSafe(data: { userId: number; otherUserId: number }): Promise<{ threadId?: number; error?: string }>;
    sendChatMessageSafe(data: { threadId: number; senderId: number; content: string }): Promise<{ success?: boolean; messageId?: number; error?: string }>;
    markMessagesAsRead(data: { threadId: number; userId: number }): Promise<{ success: boolean }>;
    getUserChatThreads(data: { userId: number }): Promise<{ threads: any[] }>;
    // Safety features
    blockUser(data: { blockerId: number; blockedId: number; reason?: string }): Promise<{ success: boolean }>;
    unblockUser(data: { blockerId: number; blockedId: number }): Promise<{ success: boolean }>;
    reportContent(data: { reporterId: number; reportedUserId?: number; reportedPostId?: number; reportedMessageId?: number; reason: string; description?: string }): Promise<{ success: boolean }>;
    isUserBlocked(data: { userId: number; targetUserId: number }): Promise<{ isBlocked: boolean }>;
    getBlockedUsers(data: { userId: number }): Promise<{ blockedUsers: any[] }>;
    // Social notifications
    getSocialNotifications(limit?: number): Promise<any[]>;
    markSocialNotificationRead(id: number): Promise<{ success: boolean }>;
    markAllSocialNotificationsRead(): Promise<{ success: boolean }>;
    getUnreadSocialNotificationsCount(): Promise<number>;
  }
}

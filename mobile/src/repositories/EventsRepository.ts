import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { FiltersState, filtersToApiParams } from '../contexts/FiltersContext';

// Tipos
export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  eventType: string;
  eventDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  city: string;
  state: string;
  address: string;
  startLocation: string;
  finishLocation: string;
  routeCoordinates: string;
  mapCenter: string;
  mapZoom: number;
  bannerUrl: string;
  logoUrl: string;
  organizerId: number;
  organizerName: string;
  organizerContact: string;
  status: string;
  featured: boolean;
  checkoutBaseUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  city: string;
  state: string;
  image: string;
  price: string;
  category: string;
  distance: string;
  registrationStatus: 'open' | 'closing' | 'closed';
  spotsLeft: number;
  featured: boolean;
  organizer: string;
}

export interface EventsResult {
  events: DisplayEvent[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Função para adaptar evento do backend para formato de exibição
export function adaptEvent(event: Event): DisplayEvent {
  const eventDate = new Date(event.eventDate);
  const now = new Date();
  const registrationEnd = event.registrationEndDate ? new Date(event.registrationEndDate) : null;
  
  let registrationStatus: 'open' | 'closing' | 'closed' = 'open';
  if (registrationEnd) {
    if (registrationEnd < now) {
      registrationStatus = 'closed';
    } else {
      const daysUntilClose = Math.ceil((registrationEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilClose <= 7) {
        registrationStatus = 'closing';
      }
    }
  }

  // Mapear tipo de evento para categoria de exibição
  const typeToDisplayCategory: Record<string, string> = {
    'corrida': 'Corrida',
    'ultramaratona': 'Ultramaratona',
    'corrida_montanha': 'Corrida de Montanha',
    'ciclismo': 'Ciclismo',
    'triathlon': 'Triathlon',
    'duathlon': 'Duathlon',
    'aquathlon': 'Aquathlon',
    'ironman': 'Ironman',
    'trail': 'Trail Run',
    'mtb': 'MTB',
    'ocr': 'Corrida de Obstáculos',
    'natacao': 'Natação',
    'caminhada': 'Caminhada',
    'outro': 'Outro',
  };

  return {
    id: event.id,
    title: event.name,
    date: eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    city: event.city || '',
    state: event.state || '',
    image: event.bannerUrl || '',
    price: 'A partir de R$ 0',
    category: typeToDisplayCategory[event.eventType] || event.eventType || 'Corrida',
    distance: '',
    registrationStatus,
    spotsLeft: 100,
    featured: event.featured || false,
    organizer: event.organizerName || '',
  };
}

// Hook para buscar eventos com filtros
export function useEvents(filters: FiltersState) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchEvents = useCallback(async (resetPage = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = filtersToApiParams(filters);
      if (resetPage) {
        params.offset = 0;
      }

      console.log('[EventsRepository] Fetching events with params:', JSON.stringify(params, null, 2));
      console.log('[EventsRepository] Current filters:', JSON.stringify({
        category: filters.category,
        trending: filters.trending,
        searchText: filters.searchText,
      }, null, 2));

      const result = await api.listEvents(params);
      console.log('[EventsRepository] API returned', result.length, 'events');
      const adaptedEvents = result.map(adaptEvent);

      if (resetPage || filters.page === 1) {
        setEvents(adaptedEvents);
      } else {
        setEvents(prev => [...prev, ...adaptedEvents]);
      }

      setTotal(result.length); // TODO: backend should return total count
      setHasMore(result.length === filters.limit);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eventos');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Buscar eventos quando filtros mudarem
  useEffect(() => {
    console.log('[EventsRepository] Filters changed, fetching events...');
    fetchEvents(true);
  }, [
    filters.searchText,
    filters.category,
    filters.trending,
    filters.dateRange?.start,
    filters.dateRange?.end,
    filters.location?.city,
    filters.location?.state,
    filters.priceRange?.min,
    filters.priceRange?.max,
    filters.distance,
    filters.sortBy,
    filters.timeFilter,
  ]);

  // Buscar mais eventos quando página mudar
  useEffect(() => {
    if (filters.page > 1) {
      fetchEvents(false);
    }
  }, [filters.page]);

  const refresh = useCallback(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      // Incrementar página é feito pelo contexto
    }
  }, [loading, hasMore]);

  return {
    events,
    loading,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
  };
}

// Hook para buscar eventos em destaque
export function useFeaturedEvents() {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.listEvents({ featured: true, limit: 5 });
      setEvents(result.map(adaptEvent));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eventos em destaque');
      console.error('Error fetching featured events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedEvents();
  }, [fetchFeaturedEvents]);

  return {
    events,
    loading,
    error,
    refresh: fetchFeaturedEvents,
  };
}

// Hook para buscar eventos por categoria
export function useEventsByCategory(category: string) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventsByCategory = useCallback(async () => {
    if (!category) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.listEvents({ type: category, limit: 20 });
      setEvents(result.map(adaptEvent));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar eventos');
      console.error('Error fetching events by category:', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchEventsByCategory();
  }, [fetchEventsByCategory]);

  return {
    events,
    loading,
    error,
    refresh: fetchEventsByCategory,
  };
}

// Hook para buscar eventos por busca de texto
export function useSearchEvents(searchText: string) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchEvents = useCallback(async () => {
    if (!searchText || searchText.length < 2) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.listEvents({ search: searchText, limit: 20 });
      setEvents(result.map(adaptEvent));
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar eventos');
      console.error('Error searching events:', err);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    const debounceTimer = setTimeout(searchEvents, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchEvents]);

  return {
    events,
    loading,
    error,
    refresh: searchEvents,
  };
}

// Função para aplicar filtros localmente (fallback)
export function applyLocalFilters(events: DisplayEvent[], filters: FiltersState): DisplayEvent[] {
  let filtered = [...events];

  // Filtro de busca
  if (filters.searchText) {
    const search = filters.searchText.toLowerCase();
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(search) ||
      event.city.toLowerCase().includes(search) ||
      event.organizer.toLowerCase().includes(search)
    );
  }

  // Filtro de categoria
  if (filters.category) {
    const categoryMap: Record<string, string> = {
      'corrida': 'Corrida',
      'ciclismo': 'Ciclismo',
      'triathlon': 'Triathlon',
      'trail': 'Trail Run',
      'natacao': 'Natação',
      'caminhada': 'Caminhada',
    };
    const displayCategory = categoryMap[filters.category];
    if (displayCategory) {
      filtered = filtered.filter(event => event.category === displayCategory);
    }
  }

  // Filtro de destaque
  if (filters.trending) {
    filtered = filtered.filter(event => event.featured);
  }

  // Filtro de localização
  if (filters.location?.city) {
    filtered = filtered.filter(event =>
      event.city.toLowerCase().includes(filters.location!.city!.toLowerCase())
    );
  }

  if (filters.location?.state) {
    filtered = filtered.filter(event =>
      event.state.toLowerCase().includes(filters.location!.state!.toLowerCase())
    );
  }

  // Ordenação
  switch (filters.sortBy) {
    case 'name':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'trending':
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    case 'date':
    default:
      // Já ordenado por data do backend
      break;
  }

  return filtered;
}

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Tipos de filtros
export interface FiltersState {
  searchText: string;
  category: string | null; // corrida, ciclismo, triathlon, trail, natacao, caminhada, outro
  trending: boolean;
  dateRange: {
    start: string | null; // ISO date string
    end: string | null;
  } | null;
  location: {
    city: string | null;
    state: string | null;
    lat?: number;
    lng?: number;
    radiusKm?: number;
  } | null;
  priceRange: {
    min: number | null;
    max: number | null;
  } | null;
  distance: number | null; // km
  tags: string[];
  sortBy: 'trending' | 'date' | 'distance' | 'price' | 'name';
  timeFilter: 'upcoming' | 'past' | 'all'; // filtro de tempo
  organizer: string | null; // filtro por organizador/empresa
  pricingType: 'all' | 'free' | 'paid'; // filtro de gratuito/pago
  page: number;
  limit: number;
}

// Estado inicial dos filtros
export const initialFiltersState: FiltersState = {
  searchText: '',
  category: null,
  trending: false,
  dateRange: null,
  location: null,
  priceRange: null,
  distance: null,
  tags: [],
  sortBy: 'date',
  timeFilter: 'upcoming', // default: próximos eventos
  organizer: null, // default: todos os organizadores
  pricingType: 'all', // default: todos (gratuitos e pagos)
  page: 1,
  limit: 20,
};

// Aliases para compatibilidade com FilterModal
export interface FilterModalCompatible {
  city: string | null;
  state: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  minPrice: number | undefined;
  maxPrice: number | undefined;
}

// Contexto
interface FiltersContextType {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  updateFilter: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
  getActiveFiltersCount: () => number;
  setSearchText: (text: string) => void;
  setCategory: (category: string | null) => void;
  setTrending: (trending: boolean) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setLocation: (city: string | null, state?: string | null) => void;
  setCity: (city: string | null) => void;
  setState: (state: string | null) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setMinPrice: (price: number | undefined) => void;
  setMaxPrice: (price: number | undefined) => void;
  setDistance: (distance: number | null) => void;
  setSortBy: (sortBy: FiltersState['sortBy']) => void;
  setTimeFilter: (timeFilter: FiltersState['timeFilter']) => void;
  setOrganizer: (organizer: string | null) => void;
  setPricingType: (pricingType: FiltersState['pricingType']) => void;
  setPage: (page: number) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

// Provider
interface FiltersProviderProps {
  children: ReactNode;
}

export function FiltersProvider({ children }: FiltersProviderProps) {
  const [filters, setFilters] = useState<FiltersState>(initialFiltersState);

  // Atualizar um filtro específico
  const updateFilter = useCallback(<K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : (value as number), // Reset page quando mudar filtros
    }));
  }, []);

  // Resetar todos os filtros
  const resetFilters = useCallback(() => {
    setFilters(initialFiltersState);
  }, []);

  // Verificar se há filtros ativos
  const hasActiveFilters = useCallback(() => {
    return (
      filters.searchText !== '' ||
      filters.category !== null ||
      filters.trending ||
      filters.dateRange !== null ||
      filters.location !== null ||
      filters.priceRange !== null ||
      filters.distance !== null ||
      filters.tags.length > 0 ||
      filters.organizer !== null ||
      filters.pricingType !== 'all'
    );
  }, [filters]);

  // Contar filtros ativos
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.category) count++;
    if (filters.trending) count++;
    if (filters.dateRange) count++;
    if (filters.location) count++;
    if (filters.priceRange) count++;
    if (filters.distance) count++;
    if (filters.tags.length > 0) count++;
    if (filters.organizer) count++;
    if (filters.pricingType !== 'all') count++;
    return count;
  }, [filters]);

  // Helpers para atualizar filtros específicos
  const setSearchText = useCallback((text: string) => {
    updateFilter('searchText', text);
  }, [updateFilter]);

  const setCategory = useCallback((category: string | null) => {
    updateFilter('category', category);
  }, [updateFilter]);

  const setTrending = useCallback((trending: boolean) => {
    updateFilter('trending', trending);
  }, [updateFilter]);

  const setDateRange = useCallback((start: string | null, end: string | null) => {
    if (!start && !end) {
      updateFilter('dateRange', null);
    } else {
      updateFilter('dateRange', { start, end });
    }
  }, [updateFilter]);

  const setLocation = useCallback((city: string | null, state: string | null = null) => {
    if (!city && !state) {
      updateFilter('location', null);
    } else {
      updateFilter('location', { city, state });
    }
  }, [updateFilter]);

  const setPriceRange = useCallback((min: number | null, max: number | null) => {
    if (min === null && max === null) {
      updateFilter('priceRange', null);
    } else {
      updateFilter('priceRange', { min, max });
    }
  }, [updateFilter]);

  const setDistance = useCallback((distance: number | null) => {
    updateFilter('distance', distance);
  }, [updateFilter]);

  const setSortBy = useCallback((sortBy: FiltersState['sortBy']) => {
    updateFilter('sortBy', sortBy);
  }, [updateFilter]);

  const setTimeFilter = useCallback((timeFilter: FiltersState['timeFilter']) => {
    updateFilter('timeFilter', timeFilter);
  }, [updateFilter]);

  const setOrganizer = useCallback((organizer: string | null) => {
    updateFilter('organizer', organizer);
  }, [updateFilter]);

  const setPricingType = useCallback((pricingType: FiltersState['pricingType']) => {
    updateFilter('pricingType', pricingType);
  }, [updateFilter]);

  const setPage = useCallback((page: number) => {
    updateFilter('page', page);
  }, [updateFilter]);

  // Funções de compatibilidade com FilterModal
  const setDateFrom = useCallback((date: string | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: date || prev.dateRange?.end ? { start: date, end: prev.dateRange?.end || null } : null,
      page: 1,
    }));
  }, []);

  const setDateTo = useCallback((date: string | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: date || prev.dateRange?.start ? { start: prev.dateRange?.start || null, end: date } : null,
      page: 1,
    }));
  }, []);

  const setCity = useCallback((city: string | null) => {
    setFilters(prev => ({
      ...prev,
      location: city || prev.location?.state ? { ...prev.location, city, state: prev.location?.state || null } : null,
      page: 1,
    }));
  }, []);

  const setStateFilter = useCallback((state: string | null) => {
    setFilters(prev => ({
      ...prev,
      location: state || prev.location?.city ? { ...prev.location, city: prev.location?.city || null, state } : null,
      page: 1,
    }));
  }, []);

  const setMinPrice = useCallback((price: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      priceRange: price !== undefined || prev.priceRange?.max !== null ? { min: price ?? null, max: prev.priceRange?.max ?? null } : null,
      page: 1,
    }));
  }, []);

  const setMaxPrice = useCallback((price: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      priceRange: price !== undefined || prev.priceRange?.min !== null ? { min: prev.priceRange?.min ?? null, max: price ?? null } : null,
      page: 1,
    }));
  }, []);

  const value: FiltersContextType = {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFiltersCount,
    setSearchText,
    setCategory,
    setTrending,
    setDateRange,
    setDateFrom,
    setDateTo,
    setLocation,
    setCity,
    setState: setStateFilter,
    setPriceRange,
    setMinPrice,
    setMaxPrice,
    setDistance,
    setSortBy,
    setTimeFilter,
    setOrganizer,
    setPricingType,
    setPage,
  };

  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  );
}

// Hook para usar o contexto
export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}

// Função utilitária para converter FiltersState para parâmetros de API
export function filtersToApiParams(filters: FiltersState): Record<string, any> {
  const params: Record<string, any> = {};

  if (filters.searchText) {
    params.search = filters.searchText;
  }

  if (filters.category) {
    params.type = filters.category;
  }

  if (filters.trending) {
    params.featured = true;
  }

  if (filters.dateRange?.start) {
    params.dateFrom = new Date(filters.dateRange.start);
  }

  if (filters.dateRange?.end) {
    params.dateTo = new Date(filters.dateRange.end);
  }

  if (filters.location?.city) {
    params.city = filters.location.city;
  }

  if (filters.location?.state) {
    params.state = filters.location.state;
  }

  if (filters.priceRange?.min !== null && filters.priceRange?.min !== undefined) {
    params.minPrice = filters.priceRange.min;
  }

  if (filters.priceRange?.max !== null && filters.priceRange?.max !== undefined) {
    params.maxPrice = filters.priceRange.max;
  }

  if (filters.distance) {
    params.distance = filters.distance;
  }

  // Adicionar sortBy e sortOrder
  if (filters.sortBy) {
    params.sortBy = filters.sortBy;
    // Para preço, ordenar do menor para maior por padrão
    params.sortOrder = filters.sortBy === 'price' ? 'asc' : 'asc';
  }

  // Adicionar timeFilter
  if (filters.timeFilter) {
    params.timeFilter = filters.timeFilter;
  }

  // Adicionar filtro por organizador
  if (filters.organizer) {
    params.organizerName = filters.organizer;
  }

  params.limit = filters.limit;
  params.offset = (filters.page - 1) * filters.limit;

  return params;
}

// Mapeamento de Modalidades Esportivas (UI) para tipos do backend
// NOTA: O campo "category" no filtro refere-se à MODALIDADE ESPORTIVA (Corrida, Triathlon, etc.)
// Não confundir com "Categoria" de inscrição (5K, 10K, Faixa Etária, etc.)
export const categoryToType: Record<string, string> = {
  'running': 'corrida',
  'ultramaratona': 'ultramaratona',
  'corrida_montanha': 'corrida_montanha',
  'trail': 'trail',
  'triathlon': 'triathlon',
  'duathlon': 'duathlon',
  'aquathlon': 'aquathlon',
  'ironman': 'ironman',
  'cycling': 'ciclismo',
  'mtb': 'mtb',
  'ocr': 'ocr',
  'swimming': 'natacao',
  'walking': 'caminhada',
  'other': 'outro',
};

// Mapeamento reverso: tipos do backend para IDs de modalidade na UI
export const typeToCategory: Record<string, string> = {
  'corrida': 'running',
  'ultramaratona': 'ultramaratona',
  'corrida_montanha': 'corrida_montanha',
  'trail': 'trail',
  'triathlon': 'triathlon',
  'duathlon': 'duathlon',
  'aquathlon': 'aquathlon',
  'ironman': 'ironman',
  'ciclismo': 'cycling',
  'mtb': 'mtb',
  'ocr': 'ocr',
  'natacao': 'swimming',
  'caminhada': 'walking',
  'outro': 'other',
};

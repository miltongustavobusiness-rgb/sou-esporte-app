import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  RefreshControl,
  ImageBackground,
  ActivityIndicator,
  Image,
  Animated,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useFilters, categoryToType } from '../contexts/FiltersContext';
import { api, Event } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';
import LocationSelector from '../components/LocationSelector';
import FilterModal, { FilterValues } from '../components/FilterModal';
import ActiveFiltersChips from '../components/ActiveFiltersChips';
import EventEngagementBar from '../components/EventEngagementBar';

// Modalidades Esportivas (chips de filtro rápido)
// Não confundir com "Categoria" de inscrição (5K, 10K, etc.)
const MODALITIES = [
  { id: 'trending', label: 'Em alta', icon: 'flame', type: null },
  { id: 'running', label: 'Corrida', icon: 'walk', type: 'corrida' },
  { id: 'ultramaratona', label: 'Ultra', icon: 'flash', type: 'ultramaratona' },
  { id: 'corrida_montanha', label: 'Montanha', icon: 'analytics', type: 'corrida_montanha' },
  { id: 'trail', label: 'Trail', icon: 'trail-sign', type: 'trail' },
  { id: 'triathlon', label: 'Triathlon', icon: 'fitness', type: 'triathlon' },
  { id: 'duathlon', label: 'Duathlon', icon: 'body', type: 'duathlon' },
  { id: 'aquathlon', label: 'Aquathlon', icon: 'water', type: 'aquathlon' },
  { id: 'ironman', label: 'Ironman', icon: 'medal', type: 'ironman' },
  { id: 'cycling', label: 'Ciclismo', icon: 'bicycle', type: 'ciclismo' },
  { id: 'mtb', label: 'MTB', icon: 'bicycle', type: 'mtb' },
  { id: 'ocr', label: 'Obstáculos', icon: 'barbell', type: 'ocr' },
  { id: 'swimming', label: 'Natação', icon: 'water', type: 'natacao' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

type AthleteHomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AthleteHome'>;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  return { day, month };
};

// Formato de data similar ao Feed (Próximos Treinos)
const formatEventDateCompact = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  let line1 = '';
  if (isToday) {
    line1 = 'Hoje';
  } else if (isTomorrow) {
    line1 = 'Amanhã';
  } else {
    line1 = dayNames[date.getDay()];
  }
  
  const line2 = `${date.getDate()} de ${months[date.getMonth()]}`;
  
  return { line1, line2 };
};

// Mapeamento de tipos de evento para labels
const eventTypeLabels: Record<string, string> = {
  'corrida': 'Corrida',
  'ultramaratona': 'Ultramaratona',
  'corrida_montanha': 'Corrida de Montanha',
  'trail': 'Trail Run',
  'triathlon': 'Triathlon',
  'duathlon': 'Duathlon',
  'aquathlon': 'Aquathlon',
  'ironman': 'Ironman',
  'ciclismo': 'Ciclismo',
  'mtb': 'MTB',
  'ocr': 'Corrida de Obstáculos',
  'natacao': 'Natação',
  'caminhada': 'Caminhada',
  'outro': 'Outros',
};

// Adapter to convert API Event to display format
const adaptEvent = (event: Event) => ({
  id: String(event.id),
  title: event.name,
  subtitle: event.shortDescription || event.description || '',
  date: event.eventDate,
  time: event.eventTime || '07:00',
  location: event.address || `${event.city}, ${event.state}`,
  city: event.city,
  state: event.state,
  image: event.bannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800',
  isFeatured: event.featured,
  status: event.status,
  organizerName: event.organizerName || undefined,
  eventType: event.eventType || 'corrida',
  eventTypeLabel: eventTypeLabels[event.eventType || 'corrida'] || 'Corrida',
  // Preço do evento
  isPaidEvent: event.isPaidEvent !== false, // true = pago, false = gratuito
  // Métricas de engajamento
  viewCount: (event as any).viewCount || 0,
  likesCount: (event as any).likesCount || 0,
  sharesCount: (event as any).sharesCount || 0,
});

interface DisplayEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string;
  isFeatured: boolean;
  isHighlight?: boolean; // Evento em alta (ranking inteligente)
  status: string;
  organizerName?: string; // Nome do organizador/empresa
  eventType?: string; // Tipo de evento (corrida, ciclismo, etc)
  eventTypeLabel?: string; // Label do tipo de evento
  isPaidEvent?: boolean; // true = pago, false = gratuito
  // Métricas de engajamento
  viewCount?: number;
  likesCount?: number;
  sharesCount?: number;
  isLiked?: boolean; // Se o usuário atual curtiu
}

interface EventCardProps {
  event: DisplayEvent;
  featured?: boolean;
  onPress: () => void;
  onLike?: (eventId: string, isLiked: boolean) => void;
  onShare?: (eventId: string) => void;
  showEngagement?: boolean; // Mostrar views, likes, shares
}

const EventCard = ({ event, featured = false, onPress, onLike, onShare, showEngagement = true }: EventCardProps) => {
  const { day, month } = formatDate(event.date);
  
  if (featured) {
    return (
      <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={onPress}>
        <ImageBackground
          source={{ uri: event.image }}
          style={styles.featuredImage}
          imageStyle={{ borderRadius: RADIUS.xl }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredBadgesRow}>
              {event.isFeatured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={12} color={COLORS.white} />
                  <Text style={styles.featuredBadgeText}>Destaque</Text>
                </View>
              )}
              {event.eventTypeLabel && (
                <View style={styles.eventTypeBadge}>
                  <Ionicons name="fitness" size={12} color={COLORS.white} />
                  <Text style={styles.eventTypeBadgeText}>{event.eventTypeLabel}</Text>
                </View>
              )}
              {event.isPaidEvent === false && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Gratuito</Text>
                </View>
              )}
            </View>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
            <View style={styles.featuredOrganizerRow}>
              <Ionicons name="business" size={12} color={COLORS.primary} />
              <Text style={styles.featuredOrganizerText}>
                {event.organizerName || 'Organizador não informado'}
              </Text>
            </View>
              <View style={styles.featuredInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={14} color={COLORS.primary} />
                  <Text style={styles.infoText}>{day} {month}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="location" size={14} color={COLORS.primary} />
                  <Text style={styles.infoText}>{event.city}, {event.state}</Text>
                </View>
              </View>
              {/* Engagement metrics */}
              {showEngagement && (
                <EventEngagementBar
                  viewCount={event.viewCount || 0}
                  likesCount={event.likesCount || 0}
                  sharesCount={event.sharesCount || 0}
                  isLiked={event.isLiked}
                  onLike={() => onLike?.(event.id, !event.isLiked)}
                  onShare={() => onShare?.(event.id)}
                  variant="light"
                />
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.eventDateBox}>
        <Text style={styles.eventDay}>{day}</Text>
        <Text style={styles.eventMonth}>{month}</Text>
      </View>
      <View style={styles.eventInfo}>
        <View style={styles.eventHeaderRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          {event.isPaidEvent === false && (
            <View style={styles.freeChip}>
              <Text style={styles.freeChipText}>Gratuito</Text>
            </View>
          )}
          {event.eventTypeLabel && (
            <View style={styles.eventTypeChip}>
              <Text style={styles.eventTypeChipText}>{event.eventTypeLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.eventLocationText}>{event.city}, {event.state}</Text>
        </View>
        <View style={styles.eventOrganizerAndEngagement}>
          <View style={styles.eventOrganizer}>
            <Ionicons name="business-outline" size={12} color={COLORS.primary} />
            <Text style={styles.eventOrganizerText}>
              {event.organizerName || 'Organizador não informado'}
            </Text>
          </View>
          {/* Engagement metrics */}
          {showEngagement && (
            <EventEngagementBar
              viewCount={event.viewCount || 0}
              likesCount={event.likesCount || 0}
              sharesCount={event.sharesCount || 0}
              isLiked={event.isLiked}
              onLike={() => onLike?.(event.id, !event.isLiked)}
              onShare={() => onShare?.(event.id)}
              variant="compact"
            />
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// Card compacto de evento em alta (estilo similar aos cards de Próximos Treinos do Feed)
const CompactHighlightCard = ({ event, onPress }: { event: DisplayEvent; onPress: () => void }) => {
  const { line1, line2 } = formatEventDateCompact(event.date);
  
  return (
    <TouchableOpacity 
      style={styles.compactEventCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.compactEventContent}>
        {/* Linha superior: Data à esquerda, Badge Em Alta à direita */}
        <View style={styles.compactEventTopRow}>
          <View style={styles.compactEventDateColumn}>
            <Text style={styles.compactEventDateLine1}>{line1}</Text>
            <Text style={styles.compactEventDateLine2}>{line2}</Text>
          </View>
          <View style={styles.compactEventBadgeColumn}>
            <View style={[styles.compactEventTypeBadge, { backgroundColor: '#FF6B35' + '30' }]}>
              <Ionicons name="flame" size={12} color="#FF6B35" />
            </View>
            {event.isPaidEvent === false && (
              <View style={styles.compactFreeChip}>
                <Text style={styles.compactFreeChipText}>Gratis</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Título do evento */}
        <Text style={styles.compactEventTitle} numberOfLines={1}>{event.title}</Text>
        
        {/* Organizador */}
        <Text style={styles.compactEventOrganizer} numberOfLines={1}>
          {event.organizerName || 'Organizador'}
        </Text>
        
        {/* Info row: local e engajamento */}
        <View style={styles.compactEventInfoRow}>
          <View style={styles.compactEventInfoItem}>
            <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
            <Text style={styles.compactEventInfoText} numberOfLines={1}>{event.city}</Text>
          </View>
          <View style={styles.compactEventInfoItem}>
            <Ionicons name="eye-outline" size={10} color={COLORS.textMuted} />
            <Text style={styles.compactEventInfoText}>{event.viewCount || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Card compacto de evento (estilo similar aos cards de Próximos Treinos do Feed)
const CompactEventCard = ({ event, onPress }: { event: DisplayEvent; onPress: () => void }) => {
  const { line1, line2 } = formatEventDateCompact(event.date);
  const typeConfig = {
    icon: 'trophy' as const,
    color: '#fbbf24', // Amarelo/dourado para competições
  };
  
  return (
    <TouchableOpacity 
      style={styles.compactEventCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.compactEventContent}>
        {/* Linha superior: Data à esquerda, Badge + Tipo à direita */}
        <View style={styles.compactEventTopRow}>
          <View style={styles.compactEventDateColumn}>
            <Text style={styles.compactEventDateLine1}>{line1}</Text>
            <Text style={styles.compactEventDateLine2}>{line2}</Text>
          </View>
          <View style={styles.compactEventBadgeColumn}>
            <View style={[styles.compactEventTypeBadge, { backgroundColor: typeConfig.color + '20' }]}>
              <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
            </View>
            {event.isPaidEvent === false && (
              <View style={styles.compactFreeChip}>
                <Text style={styles.compactFreeChipText}>Gratis</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Título do evento */}
        <Text style={styles.compactEventTitle} numberOfLines={1}>{event.title}</Text>
        
        {/* Organizador */}
        <Text style={styles.compactEventOrganizer} numberOfLines={1}>
          {event.organizerName || 'Organizador'}
        </Text>
        
        {/* Info row: local e engajamento */}
        <View style={styles.compactEventInfoRow}>
          <View style={styles.compactEventInfoItem}>
            <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
            <Text style={styles.compactEventInfoText} numberOfLines={1}>{event.city}</Text>
          </View>
          <View style={styles.compactEventInfoItem}>
            <Ionicons name="eye-outline" size={10} color={COLORS.textMuted} />
            <Text style={styles.compactEventInfoText}>{event.viewCount || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Skeleton de loading
const EventCardSkeleton = () => (
  <View style={[styles.eventCard, { opacity: 0.5 }]}>
    <View style={[styles.eventDateBox, { backgroundColor: COLORS.border }]} />
    <View style={styles.eventInfo}>
      <View style={{ height: 14, width: '70%', backgroundColor: COLORS.border, borderRadius: 4 }} />
      <View style={{ height: 10, width: '50%', backgroundColor: COLORS.border, borderRadius: 4, marginTop: 8 }} />
      <View style={{ height: 10, width: '90%', backgroundColor: COLORS.border, borderRadius: 4, marginTop: 8 }} />
    </View>
  </View>
);

// Estado vazio
const EmptyState = ({ message, onClearFilters }: { message: string; onClearFilters?: () => void }) => (
  <View style={styles.emptyState}>
    <Ionicons name="search-outline" size={64} color={COLORS.textMuted} />
    <Text style={styles.emptyTitle}>Nenhum evento encontrado</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {onClearFilters && (
      <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters}>
        <Ionicons name="refresh" size={18} color={COLORS.primary} />
        <Text style={styles.clearFiltersText}>Limpar filtros</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function AthleteHomeScreen({ navigation }: AthleteHomeScreenProps) {
  const { mode, toggleMode, user, isAuthenticated, openLogin } = useApp();
  const { 
    filters, 
    hasActiveFilters, 
    resetFilters, 
    setCategory, 
    setSearchText,
    setTrending 
  } = useFilters();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<DisplayEvent[]>([]);
  const [highlightEvents, setHighlightEvents] = useState<DisplayEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DisplayEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState('Vitória, ES');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [userStats, setUserStats] = useState({ totalRaces: 0, totalDistance: '0', averagePace: '0:00' });
  const [searchQuery, setSearchQuery] = useState('');
  const [likedEventIds, setLikedEventIds] = useState<Set<number>>(new Set());
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  
  // User display name
  const displayName = isAuthenticated ? (user?.name?.split(' ')[0] || 'Atleta') : 'Atleta';

  // Load user's liked events
  const loadUserLikes = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const result = await api.getUserLikedEventIds(user.id);
      setLikedEventIds(new Set(result.eventIds));
    } catch (e) {
      console.log('Could not load user likes');
    }
  }, [isAuthenticated, user?.id]);

  // Handle like/unlike
  const handleLike = useCallback(async (eventId: string, shouldLike: boolean) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login necessário',
        'Você precisa estar logado para curtir eventos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => openLogin?.() }
        ]
      );
      return;
    }

    const numericId = parseInt(eventId);
    
    // Optimistic update
    setLikedEventIds(prev => {
      const newSet = new Set(prev);
      if (shouldLike) {
        newSet.add(numericId);
      } else {
        newSet.delete(numericId);
      }
      return newSet;
    });

    // Update local event state
    const updateEvents = (events: DisplayEvent[]) => 
      events.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            isLiked: shouldLike,
            likesCount: (e.likesCount || 0) + (shouldLike ? 1 : -1)
          };
        }
        return e;
      });

    setFeaturedEvents(updateEvents);
    setHighlightEvents(updateEvents);
    setFilteredEvents(updateEvents);

    try {
      if (shouldLike) {
        await api.likeEvent(numericId, user!.id);
      } else {
        await api.unlikeEvent(numericId, user!.id);
      }
    } catch (error) {
      // Rollback on error
      setLikedEventIds(prev => {
        const newSet = new Set(prev);
        if (shouldLike) {
          newSet.delete(numericId);
        } else {
          newSet.add(numericId);
        }
        return newSet;
      });
      console.error('Error toggling like:', error);
    }
  }, [isAuthenticated, user, openLogin]);

  // Handle share
  const handleShare = useCallback(async (eventId: string) => {
    const event = [...featuredEvents, ...highlightEvents, ...filteredEvents].find(e => e.id === eventId);
    if (!event) return;

    try {
      const result = await Share.share({
        message: `🏃 Confira o evento "${event.title}" no Sou Esporte!\n\n📅 ${formatDate(event.date).day} ${formatDate(event.date).month}\n📍 ${event.city}, ${event.state}\n\nBaixe o app Sou Esporte e participe!`,
        title: event.title,
      });

      if (result.action === Share.sharedAction) {
        // Record share in backend
        const platform = result.activityType?.includes('whatsapp') ? 'whatsapp' 
          : result.activityType?.includes('instagram') ? 'instagram'
          : result.activityType?.includes('facebook') ? 'facebook'
          : result.activityType?.includes('twitter') ? 'twitter'
          : 'other';
        
        await api.shareEvent(parseInt(eventId), user?.id || null, platform as any);
        
        // Update local share count
        const updateEvents = (events: DisplayEvent[]) => 
          events.map(e => {
            if (e.id === eventId) {
              return { ...e, sharesCount: (e.sharesCount || 0) + 1 };
            }
            return e;
          });

        setFeaturedEvents(updateEvents);
        setHighlightEvents(updateEvents);
        setFilteredEvents(updateEvents);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [featuredEvents, highlightEvents, filteredEvents, user?.id]);

  // Verificar se há filtros ativos (incluindo modalidade selecionada)
  const filtersActive = useMemo(() => {
    return hasActiveFilters() || selectedCategory !== 'trending';
  }, [hasActiveFilters, selectedCategory]);

  // Carregar dados iniciais
  const loadInitialData = useCallback(async () => {
    try {
      // Load featured events from API
      const featuredData = await api.getFeaturedEvents();
      const featured = featuredData.map(adaptEvent);
      setFeaturedEvents(featured);
      
      // Load highlight events (Eventos em Alta) from API
      try {
        const highlightData = await api.getHighlightEvents(10);
        const highlights = highlightData.map(e => ({
          ...adaptEvent(e),
          isHighlight: true, // Marcar como evento em alta
        }));
        setHighlightEvents(highlights);
      } catch (e) {
        console.log('Could not load highlight events:', e);
        setHighlightEvents([]);
      }
      
      // Load upcoming events from API
      const upcomingData = await api.getUpcomingEvents(10);
      const upcoming = upcomingData.map(adaptEvent);
      setFilteredEvents(upcoming);
      
      // Load user stats if authenticated
      if (isAuthenticated) {
        try {
          const stats = await api.getStats();
          setUserStats({
            totalRaces: stats.totalRaces || 0,
            totalDistance: stats.totalDistance || '0',
            averagePace: stats.bestTime5k ? `${Math.floor(stats.bestTime5k / 60)}:${String(stats.bestTime5k % 60).padStart(2, '0')}` : '0:00',
          });
        } catch (e) {
          console.log('Could not load user stats');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setFeaturedEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Carregar eventos filtrados
  const loadFilteredEvents = useCallback(async () => {
    setSearchLoading(true);
    try {
      const params: any = {};
      
      // Aplicar filtros do contexto
      if (filters.searchText) {
        params.search = filters.searchText;
      }
      if (filters.category) {
        params.type = filters.category;
      }
      if (filters.location?.city) {
        params.city = filters.location.city;
      }
      if (filters.location?.state) {
        params.state = filters.location.state;
      }
      if (filters.dateRange?.start) {
        params.dateFrom = new Date(filters.dateRange.start);
      }
      if (filters.dateRange?.end) {
        params.dateTo = new Date(filters.dateRange.end);
      }
      if (filters.priceRange && filters.priceRange.min !== null) {
        params.minPrice = filters.priceRange.min;
      }
      if (filters.priceRange && filters.priceRange.max !== null) {
        params.maxPrice = filters.priceRange.max;
      }
      if (filters.distance) {
        params.distance = filters.distance;
      }
      
      // Aplicar modalidade selecionada (chips)
      if (selectedCategory !== 'trending') {
        const modalityData = MODALITIES.find(c => c.id === selectedCategory);
        if (modalityData?.type) {
          params.type = modalityData.type;
        }
      } else if (filters.trending) {
        params.featured = true;
      }
      
      // Aplicar filtro de gratuito/pago
      if (filters.pricingType === 'free') {
        params.isPaidEvent = false;
      } else if (filters.pricingType === 'paid') {
        params.isPaidEvent = true;
      }
      
      const data = await api.listEvents(params);
      setFilteredEvents(data.map(adaptEvent));
    } catch (error) {
      console.error('Error loading filtered events:', error);
      setFilteredEvents([]);
    } finally {
      setSearchLoading(false);
    }
  }, [filters, selectedCategory]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load user likes when authenticated
  useEffect(() => {
    loadUserLikes();
  }, [loadUserLikes]);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      loadFilteredEvents();
    }
  }, [filters, selectedCategory, loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    if (filtersActive) {
      await loadFilteredEvents();
    }
    setRefreshing(false);
  };

  const handleEventPress = (event: DisplayEvent) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  // Animação de fade para transição entre modos
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  
  const handleModeSwitch = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      toggleMode();
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrganizerHome' }],
      });
    });
  };

  // Função para buscar eventos por texto (inline, sem navegação)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Atualizar filtro global após debounce
    const timeoutId = setTimeout(() => {
      setSearchText(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [setSearchText]);

  // Função para selecionar modalidade (inline, sem navegação)
  const handleModalitySelect = useCallback((modalityId: string) => {
    setSelectedCategory(modalityId);
    // Não navegar, apenas atualizar estado local
    // O useEffect vai recarregar os eventos filtrados
  }, []);

  // Aplicar filtros do modal (inline, sem navegação)
  const handleApplyFilters = useCallback(async (filterValues: FilterValues) => {
    // O FilterModal já atualiza o contexto global
    // Apenas fechar o modal - os eventos serão recarregados pelo useEffect
  }, []);

  // Limpar todos os filtros
  const handleClearAllFilters = useCallback(() => {
    setSelectedCategory('trending');
    setSearchQuery('');
    resetFilters();
  }, [resetFilters]);

  // Limpar busca
  const clearSearch = () => {
    setSearchQuery('');
    setSearchText('');
  };

  // Mensagem de estado vazio
  const getEmptyMessage = () => {
    if (searchQuery) {
      return `Não encontramos eventos com "${searchQuery}". Tente outros termos.`;
    }
    if (selectedCategory !== 'trending') {
      const modalityLabel = MODALITIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
      return `Não há eventos de ${modalityLabel} no momento. Tente outra modalidade.`;
    }
    if (filters.location?.city) {
      return `Não há eventos em ${filters.location.city} no momento. Tente outra cidade.`;
    }
    return 'Não há eventos disponíveis com os filtros selecionados.';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <LinearGradient
          colors={[COLORS.background, '#1a2744']}
          style={styles.header}
        >
        {/* Logo e Ícones (incluindo perfil) */}
        <View style={styles.headerTopRow}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Teams')}>
              <Ionicons name="shirt-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            {/* Avatar do perfil ao lado do sino */}
            {isAuthenticated ? (
              <TouchableOpacity style={styles.headerProfileBtn} onPress={() => navigation.navigate('MyGrid')}>
                {user?.avatar ? (
                  <Image 
                    source={{ uri: user.avatar }} 
                    style={styles.headerProfileImage}
                  />
                ) : (
                  <View style={styles.headerProfileAvatar}>
                    <Text style={styles.headerProfileInitial}>{displayName.charAt(0)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.headerLoginBtn} onPress={() => navigation.navigate('Login')}>
                <Ionicons name="person-circle-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Saudação e botão de modo */}
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Olá, {displayName}! 👋</Text>
            <Text style={styles.subGreeting}>
              {isAuthenticated ? 'Pronto para correr?' : 'Faça login para começar'}
            </Text>
          </View>
          {/* Botão de troca de modo */}
          <TouchableOpacity style={styles.modeSwitchButton} onPress={handleModeSwitch}>
            <Ionicons name="briefcase" size={16} color={COLORS.primary} />
            <Text style={styles.modeSwitchText}>Organizador</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar with Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por competição ou organizador"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, filtersActive && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons 
              name="options" 
              size={20} 
              color={filtersActive ? COLORS.textOnPrimary : COLORS.textMuted} 
            />
            {hasActiveFilters() && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filters.searchText ? 1 : 0}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Modality Chips - Modalidades Esportivas */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {MODALITIES.map((modality) => (
            <TouchableOpacity
              key={modality.id}
              style={[
                styles.categoryChip,
                selectedCategory === modality.id && styles.categoryChipActive
              ]}
              onPress={() => handleModalitySelect(modality.id)}
            >
              <Ionicons 
                name={modality.icon as any} 
                size={16} 
                color={selectedCategory === modality.id ? COLORS.textOnPrimary : COLORS.textMuted} 
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === modality.id && styles.categoryChipTextActive
              ]}>
                {modality.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Chips de filtros ativos */}
        {hasActiveFilters() && (
          <ActiveFiltersChips onClearAll={handleClearAllFilters} />
        )}

        {/* Stats Banner - Moderno e Compacto */}
        {isAuthenticated && !filtersActive && (
          <View style={styles.statsBannerModern}>
            <View style={styles.statCardModern}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trophy" size={16} color="#fbbf24" />
              </View>
              <Text style={styles.statValueModern}>{userStats.totalRaces}</Text>
              <Text style={styles.statLabelModern}>Corridas</Text>
            </View>
            <View style={styles.statCardModern}>
              <View style={styles.statIconContainer}>
                <Ionicons name="speedometer" size={16} color="#22c55e" />
              </View>
              <Text style={styles.statValueModern}>{userStats.totalDistance}<Text style={styles.statUnitModern}>km</Text></Text>
              <Text style={styles.statLabelModern}>Total</Text>
            </View>
            <View style={styles.statCardModern}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flash" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.statValueModern}>{userStats.averagePace}</Text>
              <Text style={styles.statLabelModern}>Melhor Pace</Text>
            </View>
          </View>
        )}

        {/* Featured Events - OCULTAR quando há filtros ativos */}
        {!filtersActive && featuredEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="star" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Eventos em Destaque</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              pagingEnabled
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING.md));
                setCarouselIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {featuredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, isLiked: likedEventIds.has(parseInt(event.id)) }}
                  featured
                  onPress={() => handleEventPress(event)}
                  onLike={handleLike}
                  onShare={handleShare}
                />
              ))}
            </ScrollView>
            {/* Carousel Indicator */}
            <View style={styles.carouselIndicator}>
              {featuredEvents.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    carouselIndex === index && styles.indicatorDotActive
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Eventos em Alta - Sistema de Ranking Inteligente */}
        {!filtersActive && highlightEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="flame" size={18} color="#FF6B35" />
                <Text style={styles.sectionTitle}>Eventos em Alta</Text>
                <View style={styles.highlightBadge}>
                  <Text style={styles.highlightBadgeText}>🔥</Text>
                </View>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.highlightList}
            >
              {highlightEvents.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.highlightCard}
                  activeOpacity={0.9}
                  onPress={() => handleEventPress(event)}
                >
                  <ImageBackground
                    source={{ uri: event.image }}
                    style={styles.highlightImage}
                    imageStyle={{ borderRadius: RADIUS.lg }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.85)']}
                      style={styles.highlightGradient}
                    >
                      {/* Em Alta Badge */}
                      <View style={styles.emAltaBadge}>
                        <Ionicons name="flame" size={10} color="#fff" />
                        <Text style={styles.emAltaBadgeText}>Em Alta</Text>
                      </View>
                      {/* Badge Gratuito - Pill pequeno */}
                      {event.isPaidEvent === false && (
                        <View style={styles.freePillBadge}>
                          <Text style={styles.freePillBadgeText}>Gratuito</Text>
                        </View>
                      )}
                      <View style={styles.highlightContent}>
                        <Text style={styles.highlightTitle} numberOfLines={2}>{event.title}</Text>
                        <View style={styles.highlightOrganizerRow}>
                          <Ionicons name="business" size={10} color={COLORS.primary} />
                          <Text style={styles.highlightOrganizerText} numberOfLines={1}>
                            {event.organizerName || 'Organizador'}
                          </Text>
                        </View>
                        <View style={styles.highlightInfoRow}>
                          <View style={styles.highlightInfoItem}>
                            <Ionicons name="calendar" size={12} color={COLORS.primary} />
                            <Text style={styles.highlightInfoText}>
                              {formatDate(event.date).day} {formatDate(event.date).month}
                            </Text>
                          </View>
                          <View style={styles.highlightInfoItem}>
                            <Ionicons name="location" size={12} color={COLORS.primary} />
                            <Text style={styles.highlightInfoText} numberOfLines={1}>
                              {event.city}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Próximos Eventos - Cards compactos em scroll horizontal (estilo Feed) */}
        {!filtersActive && filteredEvents.length > 0 && (
          <View style={styles.compactEventsSection}>
            <View style={styles.sectionHeaderCompact}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="calendar" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitleSmall}>Próximos Eventos</Text>
              </View>
              <TouchableOpacity onPress={() => {/* Ver todos */}}>
                <Text style={styles.sectionLinkSmall}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.compactEventsList}
            >
              {filteredEvents
                .filter(event => {
                  if (pricingFilter === 'all') return true;
                  if (pricingFilter === 'free') return event.isPaidEvent === false;
                  if (pricingFilter === 'paid') return event.isPaidEvent !== false;
                  return true;
                })
                .map((event) => (
                  <CompactEventCard
                    key={event.id}
                    event={event}
                    onPress={() => handleEventPress(event)}
                  />
                ))
              }
            </ScrollView>
            
            {/* Filtros de preço - Gratuitos/Cobrados - Alinhados com os cards */}
            <View style={styles.pricingFilterRow}>
              <TouchableOpacity
                style={[styles.pricingFilterBtn, pricingFilter === 'all' && styles.pricingFilterBtnActive]}
                onPress={() => setPricingFilter('all')}
              >
                <Text style={[styles.pricingFilterText, pricingFilter === 'all' && styles.pricingFilterTextActive]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingFilterBtn, pricingFilter === 'free' && styles.pricingFilterBtnActive]}
                onPress={() => setPricingFilter('free')}
              >
                <Text style={[styles.pricingFilterText, pricingFilter === 'free' && styles.pricingFilterTextActive]}>Gratuitos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingFilterBtn, pricingFilter === 'paid' && styles.pricingFilterBtnActive]}
                onPress={() => setPricingFilter('paid')}
              >
                <Text style={[styles.pricingFilterText, pricingFilter === 'paid' && styles.pricingFilterTextActive]}>Cobrados</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Resultados de Busca / Lista Completa */}
        <View style={styles.section}>
          {filtersActive && (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons 
                  name="search" 
                  size={18} 
                  color={COLORS.primary} 
                />
                <Text style={styles.sectionTitle}>
                  {`Resultados${filteredEvents.length > 0 ? ` (${filteredEvents.length})` : ''}`}
                </Text>
              </View>
              {filteredEvents.length > 0 && (
                <TouchableOpacity onPress={handleClearAllFilters}>
                  <Text style={styles.clearAllText}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* Loading durante busca */}
          {searchLoading && (
            <View style={styles.searchLoadingContainer}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          )}

          {/* Lista de eventos - apenas quando há filtros ativos */}
          {filtersActive && !searchLoading && filteredEvents.length > 0 ? (
            filteredEvents
              .filter(event => {
                if (pricingFilter === 'all') return true;
                if (pricingFilter === 'free') return event.isPaidEvent === false;
                if (pricingFilter === 'paid') return event.isPaidEvent !== false;
                return true;
              })
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={{ ...event, isLiked: likedEventIds.has(parseInt(event.id)) }}
                  onPress={() => handleEventPress(event)}
                  onLike={handleLike}
                  onShare={handleShare}
                />
              ))
          ) : filtersActive && !searchLoading ? (
            <EmptyState
              message={pricingFilter !== 'all' 
                ? (pricingFilter === 'free' ? 'Nenhum evento gratuito encontrado' : 'Nenhum evento cobrado encontrado')
                : getEmptyMessage()}
              onClearFilters={filtersActive ? handleClearAllFilters : (pricingFilter !== 'all' ? () => setPricingFilter('all') : undefined)}
            />
          ) : null}
        </View>

        {/* Quick Actions - só mostrar quando não há filtros */}
        {!filtersActive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acesso Rápido</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('MyRegistrations')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(132, 204, 22, 0.2)' }]}>
                  <Ionicons name="ticket-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>Minhas{'\n'}Inscrições</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Results')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="trophy-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.quickActionText}>Meus{'\n'}Resultados</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Teams')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                  <Ionicons name="people-outline" size={24} color="#A855F7" />
                </View>
                <Text style={styles.quickActionText}>Minhas{'\n'}Equipes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => navigation.navigate('Certificates')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(234, 179, 8, 0.2)' }]}>
                  <Ionicons name="ribbon-outline" size={24} color="#EAB308" />
                </View>
                <Text style={styles.quickActionText}>Meus{'\n'}Certificados</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="events"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        mode="athlete"
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontSize: SIZES.md,
  },
  headerSafe: {
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  logoImage: {
    width: 140,
    height: 42,
    marginLeft: -8,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerProfileBtn: {
    marginLeft: 2,
  },
  headerProfileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerProfileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfileInitial: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  headerLoginBtn: {
    marginLeft: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  subGreeting: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  modeSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  modeSwitchText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
  },

  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.sm,
    paddingVertical: 0,
  },
  filterButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  categoriesContainer: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  // Stats Banner Moderno e Compacto
  statsBannerModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  statCardModern: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.2)',
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  statValueModern: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  statUnitModern: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statLabelModern: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  // Legacy stats (mantido para compatibilidade)
  statsBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  statsGradient: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  clearAllText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '600',
  },
  featuredList: {
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.lg,
  },
  featuredCard: {
    width: CARD_WIDTH,
    height: 200,
    marginRight: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  featuredBadgesRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  featuredBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  eventTypeBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  // Badge Gratuito (para cards em alta e featured) - Cor Lime, tamanho menor
  freeBadge: {
    backgroundColor: '#84CC16', // Lime
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  freeBadgeText: {
    color: '#1a2e05', // Texto escuro para contraste no lime
    fontSize: 9,
    fontWeight: '700',
  },
  featuredOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  featuredOrganizerText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  featuredContent: {
    gap: SPACING.xs,
  },
  featuredTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  featuredInfo: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
  },
  carouselIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  indicatorDotActive: {
    backgroundColor: COLORS.primary,
    width: 18,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  eventDateBox: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 20,
  },
  eventMonth: {
    fontSize: 9,
    color: COLORS.primary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  eventInfo: {
    flex: 1,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: SPACING.xs,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  eventTypeChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  eventTypeChipText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Chip Gratuito (para cards de próximos eventos) - Cor Lime, tamanho menor
  freeChip: {
    backgroundColor: '#84CC16', // Lime
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  freeChipText: {
    fontSize: 9,
    color: '#1a2e05', // Texto escuro para contraste no lime
    fontWeight: '700',
  },
  // Filtros de preço (Gratuitos/Cobrados)
  pricingFilterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
    paddingHorizontal: 16,
  },
  pricingFilterBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricingFilterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pricingFilterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  pricingFilterTextActive: {
    color: '#1a2e05',
    fontWeight: '600',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventLocationText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  eventDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  eventOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventOrganizerText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eventOrganizerAndEngagement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Engagement styles for featured cards
  engagementRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '500',
  },
  // Engagement styles for compact cards
  engagementRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  engagementItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  engagementTextCompact: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  quickAction: {
    alignItems: 'center',
    width: 68,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quickActionText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  searchLoadingContainer: {
    paddingTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  clearFiltersText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  // Estilos para Eventos em Alta
  highlightBadge: {
    marginLeft: SPACING.xs,
  },
  highlightBadgeText: {
    fontSize: 12,
  },
  highlightList: {
    paddingLeft: 0,
    paddingRight: SPACING.sm,
    gap: SPACING.md,
  },
  highlightCard: {
    width: 180,
    height: 220,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.sm,
  },
  rankingBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#FF6B35',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  rankingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emAltaBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  emAltaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Pill badge pequeno para Gratuito nos cards Em Alta
  freePillBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#84CC16',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  freePillBadgeText: {
    color: '#1a2e05',
    fontSize: 10,
    fontWeight: '700',
  },
  highlightContent: {
    gap: 4,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    lineHeight: 16,
  },
  highlightOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  highlightOrganizerText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
  },
  highlightInfoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 2,
  },
  highlightInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  highlightInfoText: {
    color: COLORS.white,
    fontSize: 10,
  },
  // Estilos para Cards Compactos de Eventos (estilo similar ao Feed)
  compactEventsSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: SPACING.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  sectionLinkSmall: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  compactEventsList: {
    paddingLeft: 16,
    paddingRight: SPACING.sm,
    gap: 10,
  },
  compactEventCard: {
    width: 180,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  compactEventContent: {
    padding: 10,
  },
  compactEventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  compactEventDateColumn: {
    flexDirection: 'column',
  },
  compactEventDateLine1: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  compactEventDateLine2: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.primary,
    opacity: 0.8,
  },
  compactEventBadgeColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  compactEventTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactFreeChip: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  compactFreeChipText: {
    fontSize: 8,
    color: '#1a2e05',
    fontWeight: '700',
  },
  compactEventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  compactEventOrganizer: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  compactEventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactEventInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  compactEventInfoText: {
    fontSize: 9,
    color: COLORS.textMuted,
    flex: 1,
  },
});

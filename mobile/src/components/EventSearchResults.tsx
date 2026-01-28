import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { useFilters, filtersToApiParams } from '../contexts/FiltersContext';
import { api, Event } from '../services/api';
import ActiveFiltersChips from './ActiveFiltersChips';

const { width } = Dimensions.get('window');

interface EventSearchResultsProps {
  onEventPress: (eventId: string) => void;
  showFeatured?: boolean; // Mostrar seção de destaques quando não há filtros
  featuredEvents?: DisplayEvent[];
  ListHeaderComponent?: React.ReactElement;
  contentContainerStyle?: any;
}

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
  status: string;
}

// Adapter para converter Event da API para DisplayEvent
const adaptEvent = (event: Event): DisplayEvent => ({
  id: String(event.id),
  title: event.name,
  subtitle: event.shortDescription || event.description || '',
  date: event.eventDate,
  time: '07:00',
  location: event.address || `${event.city}, ${event.state}`,
  city: event.city,
  state: event.state,
  image: event.bannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800',
  isFeatured: event.featured,
  status: event.status,
});

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  return { day, month };
};

// Componente de card de evento
const EventCard = ({ event, onPress }: { event: DisplayEvent; onPress: () => void }) => {
  const { day, month } = formatDate(event.date);

  return (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.eventDateBox}>
        <Text style={styles.eventDay}>{day}</Text>
        <Text style={styles.eventMonth}>{month}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.eventLocationText}>{event.city}, {event.state}</Text>
        </View>
        <Text style={styles.eventDescription} numberOfLines={1}>{event.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// Skeleton de loading
const EventCardSkeleton = () => (
  <View style={[styles.eventCard, styles.skeleton]}>
    <View style={[styles.eventDateBox, styles.skeletonBox]} />
    <View style={styles.eventInfo}>
      <View style={[styles.skeletonText, { width: '70%' }]} />
      <View style={[styles.skeletonText, { width: '50%', marginTop: 8 }]} />
      <View style={[styles.skeletonText, { width: '90%', marginTop: 8 }]} />
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

export default function EventSearchResults({
  onEventPress,
  showFeatured = true,
  featuredEvents = [],
  ListHeaderComponent,
  contentContainerStyle,
}: EventSearchResultsProps) {
  const { filters, hasActiveFilters, resetFilters } = useFilters();
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Carregar eventos com base nos filtros
  const loadEvents = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const params = filtersToApiParams(filters);
      const data = await api.listEvents(params);
      setEvents(data.map(adaptEvent));
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }, [filters]);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents(true);
  }, [loadEvents]);

  // Limpar filtros
  const handleClearFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // Verificar se há filtros ativos
  const filtersActive = hasActiveFilters();

  // Renderizar item da lista
  const renderItem = useCallback(({ item }: { item: DisplayEvent }) => (
    <EventCard event={item} onPress={() => onEventPress(item.id)} />
  ), [onEventPress]);

  // Key extractor
  const keyExtractor = useCallback((item: DisplayEvent) => item.id, []);

  // Loading inicial
  if (initialLoading) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <View style={styles.loadingContainer}>
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </View>
      </View>
    );
  }

  // Mensagem de estado vazio
  const getEmptyMessage = () => {
    if (filters.searchText) {
      return `Não encontramos eventos com "${filters.searchText}". Tente outros termos.`;
    }
    if (filters.category) {
      return 'Não há eventos nesta modalidade no momento. Tente outra modalidade ou limpe os filtros.';
    }
    if (filters.location?.city) {
      return `Não há eventos em ${filters.location.city} no momento. Tente outra cidade.`;
    }
    return 'Não há eventos disponíveis com os filtros selecionados. Tente ajustar os filtros.';
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            
            {/* Chips de filtros ativos */}
            {filtersActive && (
              <ActiveFiltersChips onClearAll={handleClearFilters} />
            )}
            
            {/* Contador de resultados */}
            {filtersActive && events.length > 0 && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {events.length} evento{events.length !== 1 ? 's' : ''} encontrado{events.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Loading durante busca */}
            {loading && !refreshing && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Buscando eventos...</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              message={getEmptyMessage()}
              onClearFilters={filtersActive ? handleClearFilters : undefined}
            />
          ) : null
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
    width: 50,
    height: 50,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventDay: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 24,
  },
  eventMonth: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventLocationText: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
  eventDescription: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  skeleton: {
    opacity: 0.6,
  },
  skeletonBox: {
    backgroundColor: COLORS.border,
  },
  skeletonText: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
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
  resultsHeader: {
    paddingVertical: SPACING.sm,
  },
  resultsCount: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
});

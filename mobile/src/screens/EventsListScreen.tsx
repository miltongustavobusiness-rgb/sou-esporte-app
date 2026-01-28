import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api, Event } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';
import EventEngagementBar from '../components/EventEngagementBar';

type EventsListScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventsList'>;
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
interface DisplayEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  city: string;
  state: string;
  image: string;
  isFeatured: boolean;
  organizerName?: string;
  eventTypeLabel?: string;
  viewCount?: number;
  likesCount?: number;
  sharesCount?: number;
  isLiked?: boolean;
}

const adaptEvent = (event: Event): DisplayEvent => ({
  id: String(event.id),
  title: event.name,
  subtitle: event.shortDescription || event.description || '',
  date: event.eventDate,
  city: event.city,
  state: event.state,
  image: event.bannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800',
  isFeatured: event.featured,
  organizerName: event.organizerName || undefined,
  eventTypeLabel: eventTypeLabels[event.eventType || 'corrida'] || 'Corrida',
  viewCount: (event as any).viewCount || 0,
  likesCount: (event as any).likesCount || 0,
  sharesCount: (event as any).sharesCount || 0,
  isLiked: false,
});

const FILTERS = [
  { id: 'all', label: 'Todos', icon: 'grid-outline' },
  { id: 'featured', label: 'Destaque', icon: 'star-outline' },
  { id: 'upcoming', label: 'Próximos', icon: 'calendar-outline' },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  return { day, month };
};

export default function EventsListScreen({ navigation }: EventsListScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DisplayEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      let loadedEvents: Event[] = [];
      
      switch (selectedFilter) {
        case 'featured':
          loadedEvents = await api.getFeaturedEvents();
          break;
        case 'upcoming':
          loadedEvents = await api.getUpcomingEvents(50);
          break;
        default:
          loadedEvents = await api.listEvents({ limit: 50 });
      }
      
      const adaptedEvents = loadedEvents.map(adaptEvent);
      setEvents(adaptedEvents);
      setFilteredEvents(adaptedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    filterEvents();
  }, [searchQuery, events]);

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        event =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  }, [loadEvents]);

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setLoading(true);
  };

  const handleEventPress = (event: DisplayEvent) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  const [likedEventIds, setLikedEventIds] = useState<Set<string>>(new Set());

  const handleLike = async (eventId: string) => {
    try {
      const isCurrentlyLiked = likedEventIds.has(eventId);
      
      if (isCurrentlyLiked) {
        await api.unlikeEvent(parseInt(eventId));
        setLikedEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
        // Update local state
        setFilteredEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, isLiked: false, likesCount: Math.max(0, (e.likesCount || 0) - 1) } : e
        ));
      } else {
        await api.likeEvent(parseInt(eventId));
        setLikedEventIds(prev => new Set(prev).add(eventId));
        // Update local state
        setFilteredEvents(prev => prev.map(e => 
          e.id === eventId ? { ...e, isLiked: true, likesCount: (e.likesCount || 0) + 1 } : e
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async (event: DisplayEvent) => {
    try {
      const result = await Share.share({
        message: `Confira o evento ${event.title} em ${event.city}, ${event.state}! \n\nBaixe o app Sou Esporte para se inscrever.`,
        title: event.title,
      });
      
      if (result.action === Share.sharedAction) {
        // Record share
        await api.shareEvent(parseInt(event.id), result.activityType || 'unknown');
        // Update local state
        setFilteredEvents(prev => prev.map(e => 
          e.id === event.id ? { ...e, sharesCount: (e.sharesCount || 0) + 1 } : e
        ));
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderEventCard = ({ item }: { item: DisplayEvent }) => {
    const { day, month } = formatDate(item.date);

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.eventImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.eventGradient}
        >
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDay}>{day}</Text>
            <Text style={styles.eventMonth}>{month}</Text>
          </View>
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.eventLocation}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.eventLocationText}>{item.city}, {item.state}</Text>
            </View>
            <View style={styles.eventOrganizer}>
              <Ionicons name="business" size={12} color={COLORS.primary} />
              <Text style={styles.eventOrganizerText}>
                {item.organizerName || 'Organizador não informado'}
              </Text>
            </View>
            {/* Engagement metrics */}
            <View style={styles.engagementContainer}>
              <EventEngagementBar
                viewCount={item.viewCount || 0}
                likesCount={item.likesCount || 0}
                sharesCount={item.sharesCount || 0}
                isLiked={item.isLiked}
                onLike={() => handleLike(item.id)}
                onShare={() => handleShare(item)}
                variant="light"
              />
            </View>
          </View>
        </LinearGradient>
        <View style={styles.badgesContainer}>
          {item.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={COLORS.white} />
            </View>
          )}
          {item.eventTypeLabel && (
            <View style={styles.eventTypeBadge}>
              <Text style={styles.eventTypeBadgeText}>{item.eventTypeLabel}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eventos</Text>
        <View style={styles.backButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos, cidades..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Filters */}
      <View style={styles.quickFilters}>
        {FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.quickFilterButton,
              selectedFilter === filter.id && styles.quickFilterButtonActive,
            ]}
            onPress={() => handleFilterChange(filter.id)}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={selectedFilter === filter.id ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.quickFilterText,
                selectedFilter === filter.id && styles.quickFilterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} encontrado{filteredEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Events List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhum evento encontrado</Text>
              <Text style={styles.emptyText}>
                Tente ajustar os filtros ou buscar por outro termo
              </Text>
            </View>
          }
        />
      )}
      
      <BottomNavigation
        activeTab="events"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        mode="athlete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body3,
    color: COLORS.text,
  },
  quickFilters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.card,
    gap: 4,
  },
  quickFilterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  quickFilterText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  quickFilterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  resultsCount: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  eventsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  eventCard: {
    height: 200,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  eventDateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  eventDay: {
    ...FONTS.h4,
    color: COLORS.white,
  },
  eventMonth: {
    ...FONTS.body5,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  eventContent: {
    gap: SPACING.xs,
  },
  eventTitle: {
    ...FONTS.h4,
    color: COLORS.white,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocationText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
  eventDescription: {
    ...FONTS.body5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  badgesContainer: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  featuredBadge: {
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTypeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTypeBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  eventOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventOrganizerText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '500',
  },
  engagementContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
});

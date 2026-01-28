import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { useFilters, categoryToType } from '../contexts/FiltersContext';
import { useEvents, DisplayEvent } from '../repositories/EventsRepository';
import FilterModal, { FilterValues } from '../components/FilterModal';
import BottomNavigation from '../components/BottomNavigation';

type EventResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventResults'>;
type EventResultsScreenRouteProp = RouteProp<RootStackParamList, 'EventResults'>;

// Modalidades Esportivas disponíveis
// Não confundir com "Categoria" de inscrição (5K, 10K, etc.)
const MODALITIES = [
  { id: 'all', label: 'Todos', icon: 'apps' },
  { id: 'trending', label: 'Em alta', icon: 'flame' },
  { id: 'running', label: 'Corrida', icon: 'walk' },
  { id: 'ultramaratona', label: 'Ultra', icon: 'flash' },
  { id: 'corrida_montanha', label: 'Montanha', icon: 'analytics' },
  { id: 'trail', label: 'Trail', icon: 'trail-sign' },
  { id: 'triathlon', label: 'Triathlon', icon: 'fitness' },
  { id: 'duathlon', label: 'Duathlon', icon: 'body' },
  { id: 'aquathlon', label: 'Aquathlon', icon: 'water' },
  { id: 'ironman', label: 'Ironman', icon: 'medal' },
  { id: 'cycling', label: 'Ciclismo', icon: 'bicycle' },
  { id: 'mtb', label: 'MTB', icon: 'bicycle' },
  { id: 'ocr', label: 'Obstáculos', icon: 'barbell' },
  { id: 'swimming', label: 'Natação', icon: 'water' },
];

export default function EventResultsScreen() {
  const navigation = useNavigation<EventResultsScreenNavigationProp>();
  const route = useRoute<EventResultsScreenRouteProp>();
  
  const { filters, setCategory, setTrending, setSearchText, resetFilters, hasActiveFilters, getActiveFiltersCount } = useFilters();
  const { events, loading, error, refresh, hasMore } = useEvents(filters);
  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  
  // Inicializar filtros baseado nos parâmetros da rota
  // IMPORTANTE: Usar dependências específicas para garantir que o useEffect reaja a mudanças
  const routeCategory = route.params?.category;
  const routeSearch = route.params?.search;
  
  useEffect(() => {
    console.log('[EventResultsScreen] Route params changed:', { category: routeCategory, search: routeSearch });
    
    if (routeCategory) {
      setSelectedCategoryId(routeCategory);
      if (routeCategory === 'trending') {
        console.log('[EventResultsScreen] Setting trending filter');
        setTrending(true);
        setCategory(null);
      } else if (routeCategory === 'all') {
        console.log('[EventResultsScreen] Clearing category filter');
        setTrending(false);
        setCategory(null);
      } else {
        const mappedCategory = categoryToType[routeCategory] || routeCategory;
        console.log('[EventResultsScreen] Setting category filter:', mappedCategory);
        setTrending(false);
        setCategory(mappedCategory);
      }
    }
    
    if (routeSearch) {
      setLocalSearchText(routeSearch);
      setSearchText(routeSearch);
    }
  }, [routeCategory, routeSearch, setCategory, setTrending, setSearchText]);
  
  // Atualizar filtros quando modalidade mudar
  const handleModalitySelect = useCallback((modalityId: string) => {
    setSelectedCategoryId(modalityId);
    
    if (modalityId === 'all') {
      setTrending(false);
      setCategory(null);
    } else if (modalityId === 'trending') {
      setTrending(true);
      setCategory(null);
    } else {
      setTrending(false);
      setCategory(categoryToType[modalityId] || modalityId);
    }
  }, [setCategory, setTrending]);
  
  // Busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(localSearchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchText, setSearchText]);
  
  // Aplicar filtros do modal
  const handleApplyFilters = useCallback((filterValues: FilterValues) => {
    setFilterModalVisible(false);
    // Os filtros são aplicados através do contexto
    // O FilterModal já atualiza o contexto diretamente
  }, []);
  
  // Limpar todos os filtros
  const handleClearFilters = useCallback(() => {
    resetFilters();
    setLocalSearchText('');
    setSelectedCategoryId('all');
  }, [resetFilters]);
  
  // Renderizar card de evento
  const renderEventCard = useCallback(({ item }: { item: DisplayEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: String(item.id) })}
      activeOpacity={0.8}
    >
      <View style={styles.eventImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.eventImage} />
        ) : (
          <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
            <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
          </View>
        )}
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color={COLORS.textOnPrimary} />
            <Text style={styles.featuredBadgeText}>Destaque</Text>
          </View>
        )}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeDay}>{item.date.split(' ')[0]}</Text>
          <Text style={styles.dateBadgeMonth}>{item.date.split(' ')[1]}</Text>
        </View>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.eventLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.eventLocationText}>{item.city}, {item.state}</Text>
        </View>
        <View style={styles.eventOrganizer}>
          <Ionicons name="business-outline" size={12} color={COLORS.primary} />
          <Text style={styles.eventOrganizerText}>
            {item.organizer || 'Organizador não informado'}
          </Text>
        </View>
        <View style={styles.eventMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
          <Text style={styles.eventPrice}>{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation]);
  
  // Renderizar estado vazio
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={COLORS.textMuted} />
      <Text style={styles.emptyStateTitle}>Nenhum evento encontrado</Text>
      <Text style={styles.emptyStateText}>
        {hasActiveFilters() 
          ? 'Tente ajustar os filtros para encontrar mais eventos'
          : 'Não há eventos disponíveis no momento'}
      </Text>
      {hasActiveFilters() && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
          <Text style={styles.clearFiltersButtonText}>Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  // Renderizar estado de erro
  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
      <Text style={styles.emptyStateTitle}>Erro ao carregar eventos</Text>
      <Text style={styles.emptyStateText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Título da tela baseado nos filtros
  const getScreenTitle = () => {
    if (selectedCategoryId === 'trending') return 'Em Alta';
    if (selectedCategoryId !== 'all') {
      const modality = MODALITIES.find(c => c.id === selectedCategoryId);
      return modality?.label || 'Eventos';
    }
    if (localSearchText) return `Busca: "${localSearchText}"`;
    return 'Eventos';
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        <View style={styles.headerRight}>
          {hasActiveFilters() && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos..."
            placeholderTextColor={COLORS.textMuted}
            value={localSearchText}
            onChangeText={setLocalSearchText}
            returnKeyType="search"
          />
          {localSearchText.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearchText('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons 
            name="options-outline" 
            size={20} 
            color={hasActiveFilters() ? COLORS.textOnPrimary : COLORS.text} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Modality Chips - Modalidades Esportivas */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {MODALITIES.map(modality => (
          <TouchableOpacity
            key={modality.id}
            style={[
              styles.categoryChip,
              selectedCategoryId === modality.id && styles.categoryChipActive
            ]}
            onPress={() => handleModalitySelect(modality.id)}
          >
            <Ionicons 
              name={modality.icon as any} 
              size={16} 
              color={selectedCategoryId === modality.id ? COLORS.textOnPrimary : COLORS.textMuted} 
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategoryId === modality.id && styles.categoryChipTextActive
            ]}>
              {modality.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Results Count */}
      {!loading && !error && events.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{events.length} eventos encontrados</Text>
          {hasActiveFilters() && (
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearFiltersLink}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Events List */}
      {error ? (
        renderErrorState()
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading && events.length > 0}
              onRefresh={refresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Carregando eventos...</Text>
            </View>
          ) : renderEmptyState()}
          ListFooterComponent={
            loading && events.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={COLORS.primary} />
            ) : null
          }
        />
      )}
      
      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="events"
        onNavigate={(screen) => navigation.navigate(screen as any)}
      />
    </SafeAreaView>
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
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  filterCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resultsCount: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  clearFiltersLink: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  eventImageContainer: {
    position: 'relative',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  featuredBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  dateBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  dateBadgeDay: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  dateBadgeMonth: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  eventInfo: {
    padding: SPACING.md,
  },
  eventTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  eventLocationText: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  eventOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  eventOrganizerText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  eventPrice: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: SIZES.md,
    color: COLORS.textMuted,
  },
  footerLoader: {
    paddingVertical: SPACING.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyStateTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  clearFiltersButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  clearFiltersButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});

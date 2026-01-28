import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';
import BottomNavigation from '../components/BottomNavigation';
import EventEngagementBar from '../components/EventEngagementBar';

type OrganizerEventsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrganizerEvents'>;
};

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'published', label: 'Publicados' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'finished', label: 'Finalizados' },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published':
      return 'Publicado';
    case 'draft':
      return 'Rascunho';
    case 'cancelled':
      return 'Cancelado';
    case 'finished':
      return 'Finalizado';
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published':
      return COLORS.success;
    case 'draft':
      return COLORS.warning;
    case 'cancelled':
      return COLORS.error;
    case 'finished':
      return COLORS.info;
    default:
      return COLORS.textSecondary;
  }
};

export default function OrganizerEventsScreen({ navigation }: OrganizerEventsScreenProps) {
  const { isAuthenticated, openLogin } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  const loadEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const myEvents = await api.getMyEvents();
      setEvents(myEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  };

  const getFilteredEvents = () => {
    if (activeTab === 'all') return events;
    return events.filter(event => event.status === activeTab);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
      activeOpacity={0.9}
    >
      {item.bannerUrl ? (
        <Image source={{ uri: item.bannerUrl }} style={styles.eventBanner} />
      ) : (
        <View style={[styles.eventBanner, styles.eventBannerPlaceholder]}>
          <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
        </View>
      )}
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.city}, {item.state}</Text>
          </View>
        </View>

        {/* Engagement metrics */}
        <View style={styles.engagementContainer}>
          <EventEngagementBar
            viewCount={item.viewCount || 0}
            likesCount={item.likesCount || 0}
            sharesCount={item.sharesCount || 0}
            variant="compact"
          />
        </View>

        <View style={styles.eventActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditEvent', { eventId: item.id })}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EventRegistrations', { eventId: item.id })}
          >
            <Ionicons name="people-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Inscritos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PublishResults', { eventId: item.id })}
          >
            <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Resultados</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Eventos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loginPrompt}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.loginPromptTitle}>Faça login para ver seus eventos</Text>
          <Text style={styles.loginPromptText}>
            Você precisa estar logado para gerenciar seus eventos
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={openLogin}>
            <Text style={styles.loginButtonText}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Eventos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.tabActive]}
              onPress={() => setActiveTab(item.id)}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.tabsList}
        />
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
          contentContainerStyle={styles.listContainer}
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
              <Text style={styles.emptyTitle}>Nenhum evento</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all' 
                  ? 'Você ainda não criou nenhum evento'
                  : `Nenhum evento ${getStatusLabel(activeTab).toLowerCase()}`}
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateEvent')}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.createButtonGradient}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                  <Text style={styles.createButtonText}>Criar Evento</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="events"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        mode="organizer"
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingBottom: SPACING.md,
  },
  tabsList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.body4,
    color: COLORS.text,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.background,
    fontWeight: '700',
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
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  eventBanner: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.border,
  },
  eventBannerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    padding: SPACING.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  eventName: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius,
  },
  statusText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  eventMeta: {
    marginBottom: SPACING.sm,
  },
  engagementContainer: {
    marginBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary + '20',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  actionButtonText: {
    ...FONTS.body5,
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  createButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  createButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: '600',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loginPromptTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  loginPromptText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
  },
  loginButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: '600',
  },
});

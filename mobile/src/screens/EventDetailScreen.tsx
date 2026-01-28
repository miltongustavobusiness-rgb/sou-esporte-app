import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api, Event, EventCategory, EventKit } from '../services/api';

import { useToast } from '../contexts/ToastContext';
import { EventStatsCard } from '../components/EventStatsCard';
const { width } = Dimensions.get('window');

type EventDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
  route: RouteProp<RootStackParamList, 'EventDetail'>;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('pt-BR', options);
};

const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function EventDetailScreen({ navigation, route }: EventDetailScreenProps) {
  const { showToast } = useToast();
  const { eventId } = route.params;
  const { isAuthenticated } = useApp();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [kits, setKits] = useState<EventKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedKit, setSelectedKit] = useState<EventKit | null>(null);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [serverTimeBrasilia, setServerTimeBrasilia] = useState<string>('');
  const [eventStartAtBrasilia, setEventStartAtBrasilia] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  // Polling for subscribers count every 20 seconds
  useEffect(() => {
    const pollSubscribers = async () => {
      try {
        const eventData = await api.getEventById(Number(eventId));
        const subCount = eventData.subscribersCount ?? 0;
        setSubscribersCount(subCount);
        const serverTime = eventData.server_time_brasilia || eventData.serverTimeBrasilia;
        if (serverTime) {
          setServerTimeBrasilia(serverTime);
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    };

    const intervalId = setInterval(pollSubscribers, 20000);
    return () => clearInterval(intervalId);
  }, [eventId]);

  const loadEvent = async () => {
    try {
      // Load event details from API
      const eventData = await api.getEventById(Number(eventId));
      setEvent(eventData);
      
      // Set countdown data from backend (use snake_case from API response)
      const serverTime = eventData.server_time_brasilia || eventData.serverTimeBrasilia;
      const eventStart = eventData.event_start_at_brasilia || eventData.eventStartAtBrasilia;
      const subCount = eventData.subscribersCount ?? 0;
      
      if (serverTime) {
        setServerTimeBrasilia(serverTime);
      }
      if (eventStart) {
        setEventStartAtBrasilia(eventStart);
      }
      setSubscribersCount(subCount);
      
      // Track event view for ranking system (fire and forget)
      api.trackEventView(Number(eventId)).catch(() => {
        // Silently ignore tracking errors
      });
      
      // Load categories
      const categoriesData = await api.getEventCategories(Number(eventId));
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0]);
      }
      
      // Load kits
      const kitsData = await api.getEventKits(Number(eventId));
      setKits(kitsData);
      if (kitsData.length > 0) {
        const includedKit = kitsData.find(k => k.additionalPrice === '0' || k.additionalPrice === '0.00');
        setSelectedKit(includedKit || kitsData[0]);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    let total = 0;
    if (selectedCategory) total += parseFloat(selectedCategory.price || '0');
    if (selectedKit) total += parseFloat(selectedKit.additionalPrice || '0');
    return total;
  };

  const [isFavorite, setIsFavorite] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { user } = useApp();

  // Load like status when event loads
  useEffect(() => {
    if (event && user?.id) {
      api.isEventLiked(Number(eventId), user.id)
        .then(result => setIsLiked(result.liked))
        .catch(() => {});
      // Set initial likes count from event data
      setLikesCount((event as any).likesCount || 0);
    }
  }, [event, user?.id, eventId]);

  const handleLike = async () => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para curtir eventos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => prev + (newLiked ? 1 : -1));

    try {
      if (newLiked) {
        await api.likeEvent(Number(eventId), user.id);
      } else {
        await api.unlikeEvent(Number(eventId), user.id);
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(!newLiked);
      setLikesCount(prev => prev + (newLiked ? -1 : 1));
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      const result = await Share.share({
        title: event.name,
        message: `🏃 Confira o evento "${event.name}" no Sou Esporte!\n\n📅 ${formatDate(event.eventDate)}\n📍 ${event.address || `${event.city}, ${event.state}`}\n\nBaixe o app Sou Esporte para se inscrever!`,
      });

      if (result.action === Share.sharedAction) {
        // Record share in backend
        const platform = result.activityType?.includes('whatsapp') ? 'whatsapp' 
          : result.activityType?.includes('instagram') ? 'instagram'
          : result.activityType?.includes('facebook') ? 'facebook'
          : result.activityType?.includes('twitter') ? 'twitter'
          : 'other';
        
        await api.shareEvent(Number(eventId), user?.id || null, platform as any);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const handleOpenRegulation = () => {
    if (event?.regulationUrl) {
      Linking.openURL(event.regulationUrl);
    } else {
      showToast('O regulamento deste evento ainda não está disponível.', 'info');
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para favoritar eventos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    setIsFavorite(!isFavorite);
    // TODO: Implementar API de favoritos
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para se inscrever em um evento.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (!selectedCategory) {
      showToast('Por favor, selecione uma categoria.', 'info');
      return;
    }

    // Navigate to registration screen
    navigation.navigate('Registration', {
      eventId: String(event?.id),
      categoryId: String(selectedCategory.id),
      kitId: selectedKit ? String(selectedKit.id) : undefined,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando evento...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Evento não encontrado</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventImage = event.bannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header Image */}
      <View style={styles.headerImage}>
        <Image source={{ uri: eventImage }} style={styles.bannerImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.headerGradient}
        />
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleLike}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#EF4444' : COLORS.white} />
            {likesCount > 0 && (
              <View style={styles.likeCountBadge}>
                <Text style={styles.likeCountText}>{likesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerOverlay}>
          <View style={styles.eventBadge}>
            <Ionicons name="calendar" size={14} color={COLORS.white} />
            <Text style={styles.eventBadgeText}>{formatDate(event.eventDate)}</Text>
          </View>
          <Text style={styles.eventTitle}>{event.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>{event.address || `${event.city}, ${event.state}`}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Stats Card with Countdown */}
        <EventStatsCard
          serverTimeBrasilia={serverTimeBrasilia}
          eventStartAtBrasilia={eventStartAtBrasilia}
          startTimeLabel={event.eventTime || '07:00'}
          categoriesCount={categories.length}
          subscribersCount={subscribersCount}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('RouteMap', { eventId: String(event.id) })}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="map-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Ver Percurso</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('EventGallery', { eventId: String(event.id) })}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="images-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleOpenRegulation}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Regulamento</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre o Evento</Text>
          <Text style={styles.description}>{event.description || event.shortDescription || 'Sem descrição disponível.'}</Text>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolha sua Categoria</Text>
            {categories.map((category) => {
              const spotsLeft = category.maxParticipants 
                ? category.maxParticipants - (category.currentParticipants || 0)
                : 999;
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory?.id === category.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={styles.categoryInfo}>
                    <Text style={[
                      styles.categoryName,
                      selectedCategory?.id === category.id && styles.categoryNameSelected,
                    ]}>
                      {category.name}
                    </Text>
                    {category.distance && (
                      <Text style={styles.categoryDistance}>{category.distance} km</Text>
                    )}
                    <Text style={styles.categorySpots}>
                      {spotsLeft > 0 ? `${spotsLeft} vagas disponíveis` : 'Esgotado'}
                    </Text>
                  </View>
                  <View style={styles.categoryPriceContainer}>
                    <Text style={[
                      styles.categoryPrice,
                      selectedCategory?.id === category.id && styles.categoryPriceSelected,
                    ]}>
                      {formatPrice(category.price)}
                    </Text>
                    {selectedCategory?.id === category.id && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Kits */}
        {kits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolha seu Kit</Text>
            {kits.map((kit) => {
              const isIncluded = kit.additionalPrice === '0' || kit.additionalPrice === '0.00';
              
              return (
                <TouchableOpacity
                  key={kit.id}
                  style={[
                    styles.kitCard,
                    selectedKit?.id === kit.id && styles.kitCardSelected,
                  ]}
                  onPress={() => setSelectedKit(kit)}
                >
                  <View style={styles.kitInfo}>
                    <View style={styles.kitHeader}>
                      <Text style={[
                        styles.kitName,
                        selectedKit?.id === kit.id && styles.kitNameSelected,
                      ]}>
                        {kit.name}
                      </Text>
                      {isIncluded && (
                        <View style={styles.includedBadge}>
                          <Text style={styles.includedText}>Incluso</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.kitDescription}>{kit.description || 'Kit padrão do evento'}</Text>
                  </View>
                  <View style={styles.kitPriceContainer}>
                    <Text style={[
                      styles.kitPrice,
                      selectedKit?.id === kit.id && styles.kitPriceSelected,
                    ]}>
                      {isIncluded ? 'Grátis' : `+${formatPrice(kit.additionalPrice)}`}
                    </Text>
                    {selectedKit?.id === kit.id && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Organizer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizador</Text>
          <View style={styles.organizerCard}>
            <View style={styles.organizerLogo}>
              <Ionicons name="business" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>
                {event.organizerName || 'Organizador não informado'}
              </Text>
              {event.organizerContact && (
                <TouchableOpacity 
                  style={styles.organizerContact}
                  onPress={() => event.organizerContact && Linking.openURL(`mailto:${event.organizerContact}`)}
                >
                  <Ionicons name="mail-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.organizerContactText}>{event.organizerContact}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>{formatPrice(getTotalPrice())}</Text>
        </View>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.registerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.registerButtonText}>Inscrever-se</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: SIZES.lg,
    marginTop: SPACING.md,
  },
  backButtonAlt: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  backButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  headerImage: {
    height: 280,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: SPACING.md,
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  likeCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  likeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.md,
    right: SPACING.md,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radius,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  eventBadgeText: {
    ...FONTS.body5,
    color: COLORS.white,
    fontWeight: '600',
  },
  eventTitle: {
    ...FONTS.h2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: -20,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickInfoLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  quickInfoValue: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  quickInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  description: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  categoryNameSelected: {
    color: COLORS.primary,
  },
  categoryDistance: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categorySpots: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  categoryPriceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryPrice: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  categoryPriceSelected: {
    color: COLORS.primary,
  },
  kitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  kitCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  kitInfo: {
    flex: 1,
  },
  kitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  kitName: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  kitNameSelected: {
    color: COLORS.primary,
  },
  includedBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  includedText: {
    ...FONTS.body5,
    color: COLORS.background,
    fontWeight: '600',
  },
  kitDescription: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  kitPriceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  kitPrice: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  kitPriceSelected: {
    color: COLORS.primary,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  organizerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  organizerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  organizerContactText: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.large,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  registerButton: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    gap: SPACING.xs,
  },
  registerButtonText: {
    ...FONTS.h4,
    color: COLORS.background,
  },
});

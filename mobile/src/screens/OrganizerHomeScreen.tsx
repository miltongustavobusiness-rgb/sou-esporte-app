import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
// Using real API data with secure endpoint
import api, { Event, OrganizerEvent } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';
import EventEngagementBar from '../components/EventEngagementBar';

const { width } = Dimensions.get('window');

type OrganizerHomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrganizerHome'>;
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        return { label: 'Inscrições Abertas', color: '#10B981', bg: '#10B98120' };
      case 'few_spots':
        return { label: 'Poucas Vagas', color: '#F59E0B', bg: '#F59E0B20' };
      case 'closed':
        return { label: 'Encerrado', color: '#EF4444', bg: '#EF444420' };
      case 'cancelled':
        return { label: 'Cancelado', color: '#DC2626', bg: '#DC262620' };
      default:
        return { label: 'Rascunho', color: '#6B7280', bg: '#6B728020' };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: config.color }]} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

export default function OrganizerHomeScreen({ navigation }: OrganizerHomeScreenProps) {
  const { user, toggleMode, mode } = useApp();
  
  // Animação de fade para transição entre modos
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  
  // Função para trocar de modo e navegar para a tela correta
  const handleModeSwitch = () => {
    // Animar fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      toggleMode();
      navigation.reset({
        index: 0,
        routes: [{ name: 'AthleteHome' }],
      });
    });
  };
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past' | 'free' | 'paid'>('all');
  
  // Estados para modal de cancelamento
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelEventId, setCancelEventId] = useState<number | null>(null);
  const [cancelEventName, setCancelEventName] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  const fetchEvents = useCallback(async () => {
    try {
      // SEGURO: Usa userId do usuário logado para buscar apenas seus eventos
      if (!user?.id) {
        console.log('[OrganizerHome] Usuário não logado, não buscando eventos');
        setEvents([]);
        setLoading(false);
        return;
      }
      console.log('[OrganizerHome] Buscando eventos do organizador userId:', user.id);
      const data = await api.getMyOrganizerEvents(user.id);
      console.log('[OrganizerHome] Eventos recebidos:', data.length);
      setEvents(data);
    } catch (error) {
      console.error('Erro ao buscar eventos do organizador:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Funções de cancelamento de evento
  const openCancelModal = (eventId: number, eventName: string) => {
    setCancelEventId(eventId);
    setCancelEventName(eventName);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setCancelEventId(null);
    setCancelEventName('');
    setCancelReason('');
  };

  const handleCancelEvent = async () => {
    if (!cancelEventId || cancelReason.trim().length < 10) {
      Alert.alert('Atenção', 'O motivo do cancelamento deve ter pelo menos 10 caracteres.');
      return;
    }

    setCancelling(true);
    try {
      const result = await api.cancelEvent(cancelEventId, cancelReason.trim(), user?.id);
      
      Alert.alert(
        'Evento Cancelado',
        `${result.message}\n\nTotal de inscrições: ${result.totalRegistrations}\nReembolsos iniciados: ${result.refundsInitiated}`,
        [{ text: 'OK', onPress: () => {
          closeCancelModal();
          fetchEvents(); // Recarregar lista de eventos
        }}]
      );
    } catch (error: any) {
      console.error('Erro ao cancelar evento:', error);
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível cancelar o evento. Tente novamente.'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Filtrar eventos por data
  const filteredEvents = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      
      switch (eventFilter) {
        case 'upcoming':
          return eventDate >= now;
        case 'past':
          return eventDate < now;
        case 'free':
          return event.isPaidEvent === false;
        case 'paid':
          return event.isPaidEvent !== false;
        default:
          return true;
      }
    }).sort((a, b) => {
      const dateA = new Date(a.eventDate).getTime();
      const dateB = new Date(b.eventDate).getTime();
      return eventFilter === 'past' ? dateB - dateA : dateA - dateB;
    });
  }, [events, eventFilter]);
  
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  // KPIs from API - will be loaded dynamically
  const [kpis, setKpis] = useState({
    inscricoesPagas: 0,
    inscricoesPendentes: 0,
    aReceber: 0,
  });
  
  // Load KPIs from API
  const loadKpis = useCallback(async () => {
    try {
      const stats = await api.getOrganizerStats();
      if (stats) {
        setKpis({
          inscricoesPagas: stats.paidRegistrations || 0,
          inscricoesPendentes: stats.pendingRegistrations || 0,
          aReceber: stats.totalRevenue || 0,
        });
      }
    } catch (error) {
      console.log('Could not load KPIs');
    }
  }, []);
  
  useEffect(() => {
    loadKpis();
  }, [loadKpis]);
  
  const displayUser = user || { name: 'Organizador' };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header - Mesmo layout do AthleteHomeScreen */}
      <LinearGradient
        colors={[COLORS.background, '#1a2744']}
        style={styles.header}
      >
        {/* Linha 1: Logo + Ícones (incluindo perfil) */}
        <View style={styles.headerTopRow}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Teams' as any)}>
              <Ionicons name="shirt-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications' as any)}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            {/* Avatar do perfil ao lado do sino */}
            <TouchableOpacity style={styles.headerProfileBtn} onPress={() => navigation.navigate('MyGrid')}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: user.avatar }} 
                  style={styles.headerProfileImage}
                />
              ) : (
                <View style={styles.headerProfileAvatar}>
                  <Text style={styles.headerProfileInitial}>
                    {displayUser.name?.charAt(0)?.toUpperCase() || 'O'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Linha 2: Saudação + Botão de Modo */}
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Olá, {displayUser.name?.split(' ')[0] || 'Organizador'}! 👋</Text>
            <Text style={styles.subGreeting}>Painel do Organizador</Text>
          </View>
          <TouchableOpacity style={styles.modeSwitchButton} onPress={handleModeSwitch}>
            <Ionicons name="walk" size={16} color={COLORS.primary} />
            <Text style={styles.modeSwitchText}>Atleta</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* KPIs Cards - Layout em Coluna */}
        <View style={styles.kpisSection}>
          {/* Card Inscrições Pagas */}
          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.kpiGradient}
            >
              <View style={styles.kpiLeft}>
                <View style={styles.kpiIconBg}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                </View>
              </View>
              <View style={styles.kpiRight}>
                <Text style={styles.kpiValue}>{kpis.inscricoesPagas}</Text>
                <Text style={styles.kpiLabel}>Inscrições Pagas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Card Inscrições Pendentes */}
          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.8}>
            <View style={styles.kpiCardDark}>
              <View style={styles.kpiLeft}>
                <View style={[styles.kpiIconBg, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                </View>
              </View>
              <View style={styles.kpiRight}>
                <Text style={styles.kpiValueDark}>{kpis.inscricoesPendentes}</Text>
                <Text style={styles.kpiLabelDark}>Inscrições Pendentes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Card A Receber */}
          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.8}>
            <View style={styles.kpiCardDark}>
              <View style={styles.kpiLeft}>
                <View style={[styles.kpiIconBg, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="cash" size={20} color="#10B981" />
                </View>
              </View>
              <View style={styles.kpiRight}>
                <Text style={[styles.kpiValueDark, { color: COLORS.primary }]}>
                  {formatCurrency(kpis.aReceber)}
                </Text>
                <Text style={styles.kpiLabelDark}>Valor a Receber</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Botão Métricas */}
        <View style={styles.metricsButtonContainer}>
          <TouchableOpacity 
            style={styles.metricsButton}
            onPress={() => navigation.navigate('OrganizerMetrics' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.metricsGradient}
            >
              <View style={styles.metricsIconBg}>
                <Ionicons name="bar-chart" size={24} color="#fff" />
              </View>
              <View style={styles.metricsTextContainer}>
                <Text style={styles.metricsTitle}>📊 Métricas</Text>
                <Text style={styles.metricsSubtitle}>Acompanhe a performance dos seus eventos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* CTA - Cadastrar Competição */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.ctaCard}
            onPress={() => navigation.navigate('CreateEvent' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaContent}>
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaTitle}>Cadastrar sua competição 🏆</Text>
                  <Text style={styles.ctaSubtitle}>
                    Comece agora e organize eventos inesquecíveis!
                  </Text>
                  <View style={styles.ctaButton}>
                    <Text style={styles.ctaButtonText}>Criar Evento</Text>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.primaryDark} />
                  </View>
                </View>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200' }}
                  style={styles.ctaImage}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Meus Eventos Criados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meus Eventos</Text>
            <Text style={styles.eventCount}>{filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}</Text>
          </View>
          
          {/* Filtros de data e tipo */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterTabsScroll}
            contentContainerStyle={styles.filterTabsContent}
          >
            <TouchableOpacity
              style={[styles.filterTab, eventFilter === 'all' && styles.filterTabActive]}
              onPress={() => setEventFilter('all')}
            >
              <Text style={[styles.filterTabText, eventFilter === 'all' && styles.filterTabTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, eventFilter === 'upcoming' && styles.filterTabActive]}
              onPress={() => setEventFilter('upcoming')}
            >
              <Text style={[styles.filterTabText, eventFilter === 'upcoming' && styles.filterTabTextActive]}>Próximos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, eventFilter === 'past' && styles.filterTabActive]}
              onPress={() => setEventFilter('past')}
            >
              <Text style={[styles.filterTabText, eventFilter === 'past' && styles.filterTabTextActive]}>Passados</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, eventFilter === 'free' && styles.filterTabActive]}
              onPress={() => setEventFilter('free')}
            >
              <Text style={[styles.filterTabText, eventFilter === 'free' && styles.filterTabTextActive]}>Gratuitos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, eventFilter === 'paid' && styles.filterTabActive]}
              onPress={() => setEventFilter('paid')}
            >
              <Text style={[styles.filterTabText, eventFilter === 'paid' && styles.filterTabTextActive]}>Cobrados</Text>
            </TouchableOpacity>
          </ScrollView>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="calendar-outline" size={32} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyStateTitle}>
                {events.length === 0 
                  ? 'Você ainda não criou eventos' 
                  : eventFilter === 'past' 
                    ? 'Nenhum evento passado' 
                    : eventFilter === 'upcoming' 
                      ? 'Nenhum evento próximo' 
                      : eventFilter === 'free'
                        ? 'Nenhum evento gratuito'
                        : eventFilter === 'paid'
                          ? 'Nenhum evento cobrado'
                          : 'Nenhum evento encontrado'}
              </Text>
              <Text style={styles.emptyStateText}>
                {events.length === 0 
                  ? 'Crie seu primeiro evento e comece a receber inscrições!' 
                  : 'Tente outro filtro para ver mais eventos'}
              </Text>
              {events.length === 0 && (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('CreateEvent' as any)}
                >
                  <Ionicons name="add" size={18} color={COLORS.white} />
                  <Text style={styles.emptyStateButtonText}>Criar Evento</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.eventsList}>
              {filteredEvents.map((event) => (
                <View key={event.id} style={styles.eventListCard}>
                  <TouchableOpacity 
                    style={styles.eventListContent}
                    onPress={() => navigation.navigate('EventDetail' as any, { eventId: event.id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.eventListImageContainer}>
                      {event.bannerUrl ? (
                        <Image source={{ uri: event.bannerUrl }} style={styles.eventListImage} />
                      ) : (
                        <LinearGradient
                          colors={[COLORS.primaryDark, COLORS.primary]}
                          style={styles.eventListImagePlaceholder}
                        >
                          <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.4)" />
                        </LinearGradient>
                      )}
                    </View>
                    <View style={styles.eventListInfo}>
                      <View style={styles.eventTitleRow}>
                        <Text style={styles.eventListTitle} numberOfLines={1}>{event.name}</Text>
                        {event.isPaidEvent === false && (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>Gratuito</Text>
                          </View>
                        )}
                      </View>
                      <StatusBadge status={event.status} />
                      {event.organizerName && (
                        <View style={styles.eventOrganizerRow}>
                          <Ionicons name="business-outline" size={12} color={COLORS.primary} />
                          <Text style={styles.eventOrganizerText}>{event.organizerName}</Text>
                        </View>
                      )}
                      <View style={styles.eventListMeta}>
                        <View style={styles.eventInfoRow}>
                          <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
                          <Text style={styles.eventInfoText}>{formatDate(event.eventDate)}</Text>
                        </View>
                        <View style={styles.eventInfoRow}>
                          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                          <Text style={styles.eventInfoText}>{event.city}, {event.state}</Text>
                        </View>
                      </View>
                      <View style={styles.eventListStats}>
                        <View style={styles.eventStat}>
                          <Ionicons name="people" size={14} color={COLORS.primary} />
                          <Text style={styles.eventStatText}>{event.totalRegistrations || 0} inscritos</Text>
                        </View>
                        <Text style={styles.eventVagas}>{event.maxParticipants || 50} vagas</Text>
                      </View>
                      {/* Engagement metrics */}
                      <View style={styles.eventEngagementRow}>
                        <EventEngagementBar
                          viewCount={event.viewCount || 0}
                          likesCount={event.likesCount || 0}
                          sharesCount={event.sharesCount || 0}
                          variant="compact"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.eventActionsVertical}>
                    <TouchableOpacity 
                      style={styles.editButtonVertical}
                      onPress={() => navigation.navigate('EditEvent' as any, { eventId: event.id })}
                    >
                      <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    {event.status !== 'cancelled' && (
                      <TouchableOpacity 
                        style={styles.cancelButtonVertical}
                        onPress={() => openCancelModal(event.id, event.name)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Ações Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateEvent' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="add-circle" size={26} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Criar Evento</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('ManageRegistrations' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="people" size={26} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>Inscrições</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('PublishResults' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="trophy" size={26} color="#F59E0B" />
              </View>
              <Text style={styles.actionLabel}>Resultados</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="bar-chart" size={26} color="#8B5CF6" />
              </View>
              <Text style={styles.actionLabel}>Relatórios</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Atividade Recente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atividade Recente</Text>
          <View style={styles.activityList}>
            {events.length > 0 ? (
              events.slice(0, 4).map((event, index) => (
                <View key={index} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: COLORS.primary + '15' }]}>
                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>Evento: {event.name}</Text>
                    <Text style={styles.activityTime}>{formatDate(event.eventDate)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyStateText}>Nenhuma atividade recente</Text>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Cancelamento */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Cancelar Evento</Text>
              <Text style={styles.modalSubtitle}>{cancelEventName}</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalWarning}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" /> Atenção: Esta ação não pode ser desfeita!
              </Text>
              <Text style={styles.modalDescription}>
                Ao cancelar este evento, todos os inscritos serão notificados e os pagamentos serão reembolsados automaticamente.
              </Text>

              <Text style={styles.inputLabel}>Motivo do cancelamento *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Descreva o motivo do cancelamento (mín. 10 caracteres)"
                placeholderTextColor={COLORS.textSecondary}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {cancelReason.length}/10 caracteres mínimos
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeCancelModal}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelBtnText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (cancelReason.trim().length < 10 || cancelling) && styles.modalConfirmBtnDisabled
                ]}
                onPress={handleCancelEvent}
                disabled={cancelReason.trim().length < 10 || cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#FFF" />
                    <Text style={styles.modalConfirmBtnText}>Confirmar Cancelamento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="home"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        mode="organizer"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  logoImage: {
    width: 140,
    height: 50,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerIconBtn: {
    position: 'relative',
    padding: 8,
  },
  headerProfileBtn: {
    padding: 4,
    marginLeft: 4,
  },
  headerProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerProfileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfileInitial: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subGreeting: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  modeSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  modeSwitchText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  // KPIs Section
  kpisSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  kpiCard: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  kpiGradient: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCardDark: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  kpiLeft: {
    marginRight: SPACING.md,
  },
  kpiRight: {
    flex: 1,
  },
  kpiIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  kpiValueDark: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  kpiLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  kpiLabelDark: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  // Metrics Button
  metricsButtonContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  metricsButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  metricsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  metricsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  metricsTextContainer: {
    flex: 1,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  metricsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // CTA Card
  ctaCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  ctaGradient: {
    padding: SPACING.lg,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaTextContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background,
    marginBottom: 6,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: COLORS.background,
    opacity: 0.8,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  ctaImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
  },
  // Events
  eventsScroll: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  eventCard: {
    width: 240,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  eventImageContainer: {
    height: 120,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventContent: {
    padding: SPACING.md,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventStatText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  eventVagas: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '600',
  },
  eventOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventOrganizerText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  eventEngagementRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Loading & Empty States
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  // Activity
  activityList: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Event Count
  eventCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterTabsScroll: {
    marginBottom: SPACING.md,
  },
  filterTabsContent: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.textOnPrimary,
  },
  // Events List (vertical)
  eventsList: {
    gap: SPACING.md,
  },
  eventListCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  eventListContent: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.md,
  },
  eventListImageContainer: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  eventListImage: {
    width: '100%',
    height: '100%',
  },
  eventListImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventListInfo: {
    flex: 1,
  },
  eventListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: SPACING.sm,
  },
  eventListTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventListMeta: {
    marginBottom: 4,
  },
  eventListStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  editButton: {
    padding: SPACING.md,
  },
  cancelButton: {
    padding: SPACING.md,
    marginLeft: SPACING.xs,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  // Layout vertical para botões Editar/Deletar
  eventActionsVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.xs,
  },
  editButtonVertical: {
    padding: SPACING.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonVertical: {
    padding: SPACING.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Badge Gratuito - Cor Lime
  freeBadge: {
    backgroundColor: '#84CC16', // Lime
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  freeBadgeText: {
    color: '#1a2e05', // Texto escuro para contraste no lime
    fontSize: 9,
    fontWeight: '700',
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  // Modal de Cancelamento
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: SIZES.md,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalWarning: {
    fontSize: SIZES.sm,
    fontFamily: FONTS.medium,
    color: '#F59E0B',
    backgroundColor: '#F59E0B15',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  reasonInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalCancelBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  modalConfirmBtn: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  modalConfirmBtnDisabled: {
    backgroundColor: '#EF444460',
  },
  modalConfirmBtnText: {
    fontSize: SIZES.md,
    fontFamily: FONTS.semiBold,
    color: '#FFF',
  },
});

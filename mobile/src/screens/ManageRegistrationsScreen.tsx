import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { api, Event, Registration } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type ManageRegistrationsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ManageRegistrations'>;
  route: RouteProp<RootStackParamList, 'ManageRegistrations'>;
};

const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function ManageRegistrationsScreen({ navigation, route }: ManageRegistrationsScreenProps) {
  const { showToast } = useToast();
  const eventId = route.params?.eventId;
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(eventId ? Number(eventId) : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getMobileEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, [selectedEventId]);

  // Load registrations for selected event
  const loadRegistrations = useCallback(async () => {
    if (!selectedEventId) return;
    
    try {
      const data = await api.getEventRegistrations(selectedEventId);
      setRegistrations(data);
      
      // Also load event details
      const eventData = await api.getEventById(selectedEventId);
      setEvent(eventData);
    } catch (error) {
      console.error('Error loading registrations:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      setLoading(true);
      loadRegistrations();
    }
  }, [selectedEventId, loadRegistrations]);

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      (reg.athleteName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.athleteEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.bibNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || reg.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: registrations.length,
    confirmed: registrations.filter(r => r.status === 'confirmed' || r.paymentStatus === 'paid').length,
    pending: registrations.filter(r => r.status === 'pending' || r.paymentStatus === 'pending').length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
    revenue: registrations
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + parseFloat(String(r.totalPrice || 0)), 0),
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRegistrations();
    setRefreshing(false);
  };

  const handleConfirmPayment = async (registration: Registration) => {
    Alert.alert(
      'Confirmar Pagamento',
      `Confirmar pagamento de ${formatPrice(registration.totalPrice)} de ${registration.athleteName || 'Atleta'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setProcessingId(registration.id);
            try {
              await api.confirmPayment(registration.id);
              // Update local state
              setRegistrations(prev =>
                prev.map(r => r.id === registration.id 
                  ? { ...r, paymentStatus: 'paid', status: 'confirmed' } 
                  : r
                )
              );
              showToast('Pagamento confirmado com sucesso.', 'info');
            } catch (error: any) {
              showToast(error.message || 'Não foi possível confirmar o pagamento', 'error');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelRegistration = (registration: Registration) => {
    Alert.alert(
      'Cancelar Inscrição',
      `Tem certeza que deseja cancelar a inscrição de ${registration.athleteName || 'Atleta'}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(registration.id);
            try {
              await api.cancelRegistration(registration.id);
              // Update local state
              setRegistrations(prev =>
                prev.map(r => r.id === registration.id 
                  ? { ...r, status: 'cancelled' } 
                  : r
                )
              );
              showToast('A inscrição foi cancelada com sucesso.', 'info');
            } catch (error: any) {
              showToast(error.message || 'Não foi possível cancelar a inscrição', 'error');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSendReminder = (registration: Registration) => {
    Alert.alert(
      'Enviar Lembrete',
      `Enviar lembrete de pagamento para ${registration.athleteName || 'Atleta'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              // API call would go here
              showToast(`Lembrete enviado para ${registration.athleteEmail || 'o atleta'}!`, 'success');
            } catch (error) {
              showToast('Não foi possível enviar o lembrete', 'info');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': 
      case 'paid':
        return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const renderRegistrationCard = (registration: Registration) => (
    <View key={registration.id} style={styles.registrationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.athleteInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(registration.athleteName || 'A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.athleteDetails}>
            <Text style={styles.athleteName}>{registration.athleteName || 'Atleta'}</Text>
            <Text style={styles.registrationNumber}>{registration.bibNumber || `#${registration.id}`}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(registration.paymentStatus || registration.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(registration.paymentStatus || registration.status) }]}>
            {getStatusLabel(registration.paymentStatus || registration.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{registration.categoryName || 'Categoria'}</Text>
          </View>
          {registration.kitName && (
            <View style={styles.infoItem}>
              <Ionicons name="gift-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{registration.kitName}</Text>
            </View>
          )}
        </View>

        {registration.athleteEmail && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{registration.athleteEmail}</Text>
            </View>
          </View>
        )}

        <View style={styles.paymentRow}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>Pagamento:</Text>
            <Text style={[
              styles.paymentStatus,
              { color: registration.paymentStatus === 'paid' ? COLORS.success : COLORS.warning }
            ]}>
              {registration.paymentStatus === 'paid' ? 'Pago' : 'Aguardando'}
            </Text>
          </View>
          <Text style={styles.amountText}>{formatPrice(registration.totalPrice)}</Text>
        </View>
      </View>

      {/* Actions */}
      {registration.status !== 'cancelled' && (
        <View style={styles.cardActions}>
          {registration.paymentStatus === 'pending' && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleConfirmPayment(registration)}
                disabled={processingId === registration.id}
              >
                {processingId === registration.id ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                    <Text style={[styles.actionText, { color: COLORS.success }]}>Confirmar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSendReminder(registration)}
              >
                <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.actionText, { color: COLORS.primary }]}>Lembrete</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCancelRegistration(registration)}
            disabled={processingId === registration.id}
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !events.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gerenciar Inscrições</Text>
          <TouchableOpacity onPress={() => showToast('Funcionalidade em desenvolvimento', 'info')}>
            <Ionicons name="download-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Event Selector */}
        {events.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.eventSelector}
          >
            {events.map(ev => (
              <TouchableOpacity
                key={ev.id}
                style={[
                  styles.eventChip,
                  selectedEventId === ev.id && styles.eventChipSelected
                ]}
                onPress={() => setSelectedEventId(ev.id)}
              >
                <Text style={[
                  styles.eventChipText,
                  selectedEventId === ev.id && styles.eventChipTextSelected
                ]}>
                  {ev.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{formatPrice(stats.revenue)}</Text>
            <Text style={styles.statLabel}>Receita</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, email ou número..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {(['all', 'confirmed', 'pending', 'cancelled'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, selectedFilter === filter && styles.filterChipSelected]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextSelected]}>
              {filter === 'all' ? 'Todos' : 
               filter === 'confirmed' ? 'Confirmados' :
               filter === 'pending' ? 'Pendentes' : 'Cancelados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Registrations List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredRegistrations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyStateTitle}>Nenhuma inscrição encontrada</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Tente buscar com outros termos' : 'Ainda não há inscrições neste evento'}
            </Text>
          </View>
        ) : (
          filteredRegistrations.map(renderRegistrationCard)
        )}
        
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  eventSelector: {
    marginBottom: SPACING.md,
  },
  eventChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: SPACING.sm,
  },
  eventChipSelected: {
    backgroundColor: COLORS.white,
  },
  eventChipText: {
    fontSize: SIZES.sm,
    color: COLORS.white,
  },
  eventChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  registrationCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  athleteDetails: {
    flex: 1,
  },
  athleteName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  registrationNumber: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  paymentLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  paymentStatus: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  amountText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { api, Event, Registration } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';

import { useToast } from '../contexts/ToastContext';
type CheckInScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CheckIn'>;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function CheckInScreen({ navigation }: CheckInScreenProps) {
  const { showToast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEventSelector, setShowEventSelector] = useState(true);

  // Load organizer events
  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getMobileEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load registrations for selected event
  const loadRegistrations = useCallback(async () => {
    if (!selectedEvent) return;
    
    try {
      const data = await api.getEventRegistrations(selectedEvent.id);
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      setRegistrations([]);
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      loadRegistrations();
    }
  }, [selectedEvent, loadRegistrations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (selectedEvent) {
      await loadRegistrations();
    } else {
      await loadEvents();
    }
    setIsRefreshing(false);
  };

  const handleCheckIn = async (registration: Registration) => {
    Alert.alert(
      'Confirmar Check-in',
      `Deseja confirmar o check-in de ${registration.athleteName || 'Atleta'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.performCheckIn(registration.id);
              // Update local state
              setRegistrations(prev =>
                prev.map(r => r.id === registration.id ? { ...r, checkedIn: true } : r)
              );
              showToast('Check-in realizado com sucesso!', 'info');
            } catch (error: any) {
              showToast(error.message || 'Não foi possível realizar o check-in', 'error');
            }
          },
        },
      ]
    );
  };

  const handleScanQR = () => {
    showToast('Funcionalidade de scanner QR Code em desenvolvimento', 'info');
  };

  const filteredRegistrations = registrations.filter(r =>
    (r.athleteName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.bibNumber || '').includes(searchQuery) ||
    (r.athleteCpf || '').includes(searchQuery)
  );

  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  const totalCount = registrations.length;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (showEventSelector && !selectedEvent) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Check-in de Atletas</Text>
          <Text style={styles.headerSubtitle}>Selecione um evento para iniciar</Text>
        </LinearGradient>

        <View style={styles.eventSelectorContainer}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.textMuted} style={{ marginBottom: SPACING.lg }} />
          <Text style={styles.selectEventTitle}>Selecione um Evento</Text>
          <Text style={styles.selectEventSubtitle}>Escolha o evento para gerenciar o check-in</Text>

          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Nenhum evento encontrado</Text>
              <TouchableOpacity 
                style={styles.createEventButton}
                onPress={() => navigation.navigate('CreateEvent' as any)}
              >
                <Text style={styles.createEventButtonText}>Criar Evento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventOption}
                onPress={() => {
                  setSelectedEvent(event);
                  setShowEventSelector(false);
                }}
              >
                <View style={styles.eventOptionIcon}>
                  <Ionicons name="flag" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.eventOptionInfo}>
                  <Text style={styles.eventOptionName}>{event.name}</Text>
                  <Text style={styles.eventOptionDate}>{formatDate(event.eventDate)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <BottomNavigation
          activeTab="tickets"
          onNavigate={(screen) => navigation.navigate(screen as any)}
          mode="organizer"
        />
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
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => {
            setShowEventSelector(true);
            setSelectedEvent(null);
          }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Check-in</Text>
            <Text style={styles.eventName}>{selectedEvent?.name}</Text>
          </View>
          <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
            <Ionicons name="qr-code" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{checkedInCount}</Text>
            <Text style={styles.statLabel}>Confirmados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount - checkedInCount}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, número ou CPF..."
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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {filteredRegistrations.map((registration) => (
          <View key={registration.id} style={styles.registrationCard}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{registration.bibNumber || '---'}</Text>
            </View>
            <View style={styles.registrationInfo}>
              <Text style={styles.athleteName}>{registration.athleteName || 'Atleta'}</Text>
              <Text style={styles.athleteDetails}>{registration.categoryName}</Text>
              <Text style={styles.athleteCpf}>{registration.athleteCpf ? `***.***.***-${registration.athleteCpf.slice(-2)}` : '---'}</Text>
            </View>
            {registration.checkedIn ? (
              <View style={styles.checkedInBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.checkedInText}>OK</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={() => handleCheckIn(registration)}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.checkInButtonGradient}
                >
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {filteredRegistrations.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>
              {registrations.length === 0 ? 'Nenhuma inscrição encontrada' : 'Nenhum atleta encontrado'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation
        activeTab="tickets"
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
  loadingContainer: {
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  eventName: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: SIZES.xl,
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  registrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  numberBadge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  numberText: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  registrationInfo: {
    flex: 1,
  },
  athleteName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  athleteDetails: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  athleteCpf: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  checkedInBadge: {
    alignItems: 'center',
    gap: 2,
  },
  checkedInText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: '#10B981',
  },
  checkInButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  checkInButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  eventSelectorContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  selectEventTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  selectEventSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    width: '100%',
    ...SHADOWS.light,
  },
  eventOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  eventOptionInfo: {
    flex: 1,
  },
  eventOptionName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  eventOptionDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  createEventButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  createEventButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
});

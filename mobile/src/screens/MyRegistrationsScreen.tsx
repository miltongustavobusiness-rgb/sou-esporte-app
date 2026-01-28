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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api, Registration } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type MyRegistrationsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyRegistrations'>;
};

const TABS = [
  { id: 'upcoming', label: 'Próximas' },
  { id: 'past', label: 'Anteriores' },
  { id: 'cancelled', label: 'Canceladas' },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'paid':
      return '#22C55E';
    case 'pending':
      return '#EAB308';
    case 'cancelled':
      return '#EF4444';
    default:
      return COLORS.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmada';
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Pendente';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
};

export default function MyRegistrationsScreen({ navigation }: MyRegistrationsScreenProps) {
  const { showToast } = useToast();
  const { isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const loadRegistrations = useCallback(async () => {
    try {
      const data = await api.getMyRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRegistrations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadRegistrations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRegistrations();
    setIsRefreshing(false);
  };

  const getFilteredRegistrations = () => {
    const now = new Date();
    
    return registrations.filter(reg => {
      const eventDate = new Date(reg.eventDate);
      const isCancelled = reg.status === 'cancelled';
      const isPast = eventDate < now;
      
      switch (activeTab) {
        case 'upcoming':
          return !isCancelled && !isPast;
        case 'past':
          return !isCancelled && isPast;
        case 'cancelled':
          return isCancelled;
        default:
          return true;
      }
    });
  };

  const handlePayment = async (registration: Registration) => {
    Alert.alert(
      'Pagamento',
      `Deseja pagar a inscrição de ${formatPrice(registration.totalPrice)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Pagar', 
          onPress: () => {
            // Navigate to payment or process payment
            showToast('Redirecionando para pagamento...', 'info');
          }
        },
      ]
    );
  };

  const handleViewDetails = (registration: Registration) => {
    navigation.navigate('EventDetail', { eventId: String(registration.eventId) });
  };

  const renderRegistrationCard = ({ item }: { item: Registration }) => {
    const eventImage = item.eventBannerUrl || 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800';
    
    return (
      <TouchableOpacity 
        style={styles.registrationCard} 
        activeOpacity={0.9}
        onPress={() => handleViewDetails(item)}
      >
        <Image source={{ uri: eventImage }} style={styles.eventImage} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{formatDate(item.eventDate)}</Text>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>{item.eventCity}, {item.eventState}</Text>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="business-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.dateText, { color: COLORS.primary }]}>
                  {item.eventOrganizerName || 'Organizador não informado'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus || item.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.paymentStatus || item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.paymentStatus || item.status) }]}>
                {getStatusLabel(item.paymentStatus || item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Categoria</Text>
              <Text style={styles.detailValue}>{item.categoryName}</Text>
            </View>
            {item.kitName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kit</Text>
                <Text style={styles.detailValue}>{item.kitName}</Text>
              </View>
            )}
            {item.bibNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nº de Peito</Text>
                <Text style={styles.bibNumber}>{item.bibNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>{formatPrice(item.totalPrice)}</Text>
            </View>
            <View style={styles.cardActions}>
              {(item.paymentStatus === 'pending' || item.status === 'pending') && (
                <TouchableOpacity style={styles.payButton} onPress={() => handlePayment(item)}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.payButtonGradient}
                  >
                    <Text style={styles.payButtonText}>Pagar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.detailsButton} onPress={() => handleViewDetails(item)}>
                <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Minhas Inscrições</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Faça login para ver suas inscrições</Text>
          <Text style={styles.emptyText}>
            Você precisa estar logado para acessar suas inscrições
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.exploreButtonText}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredRegistrations = getFilteredRegistrations();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Inscrições</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Registrations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando inscrições...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRegistrations}
          renderItem={renderRegistrationCard}
          keyExtractor={item => String(item.id)}
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
              <Ionicons name="ticket-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma inscrição</Text>
              <Text style={styles.emptyText}>
                Você ainda não tem inscrições {activeTab === 'upcoming' ? 'próximas' : activeTab === 'past' ? 'anteriores' : 'canceladas'}
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('EventsList')}
              >
                <Text style={styles.exploreButtonText}>Explorar Eventos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.card,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
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
    paddingBottom: SPACING.xl,
  },
  registrationCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  eventName: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radius,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...FONTS.body5,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  cardDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  detailValue: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  bibNumber: {
    ...FONTS.h4,
    color: COLORS.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceContainer: {},
  priceLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  priceValue: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  payButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  payButtonGradient: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  payButtonText: {
    ...FONTS.body4,
    color: COLORS.background,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  exploreButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
  },
  exploreButtonText: {
    ...FONTS.body4,
    color: COLORS.background,
    fontWeight: '600',
  },
});

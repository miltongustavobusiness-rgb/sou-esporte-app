import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

type OrganizerMetricsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrganizerMetrics'>;
};

interface OrganizerMetrics {
  totalEvents: number;
  activeEvents: number;
  finishedEvents: number;
  cancelledEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  averageOccupancy: number;
}

interface EventMetrics {
  id: number;
  name: string;
  eventDate: string;
  status: string;
  registrations: number;
  paidRegistrations: number;
  revenue: number;
  views: number;
  likes: number;
  shares: number;
  occupancyRate: number;
  conversionRate: number;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        return { label: 'Ativo', color: '#10B981', bg: '#10B98120' };
      case 'finished':
        return { label: 'Finalizado', color: '#6B7280', bg: '#6B728020' };
      case 'cancelled':
        return { label: 'Cancelado', color: '#EF4444', bg: '#EF444420' };
      default:
        return { label: 'Rascunho', color: '#F59E0B', bg: '#F59E0B20' };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

export default function OrganizerMetricsScreen({ navigation }: OrganizerMetricsScreenProps) {
  const { user } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<OrganizerMetrics | null>(null);
  const [eventMetrics, setEventMetrics] = useState<EventMetrics[]>([]);

  const loadMetrics = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const [overviewData, eventsData] = await Promise.all([
        api.getOrganizerMetrics(user.id),
        api.getOrganizerEventMetrics(user.id),
      ]);
      
      setMetrics(overviewData);
      setEventMetrics(eventsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMetrics();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Dashboard de Métricas</Text>
          <View style={{ width: 40 }} />
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
        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          
          <View style={styles.overviewGrid}>
            {/* Total Events */}
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBg, { backgroundColor: '#6366F120' }]}>
                <Ionicons name="calendar" size={20} color="#6366F1" />
              </View>
              <Text style={styles.overviewValue}>{metrics?.totalEvents || 0}</Text>
              <Text style={styles.overviewLabel}>Total de Eventos</Text>
              <View style={styles.overviewSubStats}>
                <Text style={styles.overviewSubStat}>
                  <Text style={{ color: '#10B981' }}>{metrics?.activeEvents || 0}</Text> ativos
                </Text>
                <Text style={styles.overviewSubStat}>
                  <Text style={{ color: '#6B7280' }}>{metrics?.finishedEvents || 0}</Text> finalizados
                </Text>
              </View>
            </View>

            {/* Total Registrations */}
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBg, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="people" size={20} color="#10B981" />
              </View>
              <Text style={styles.overviewValue}>{formatNumber(metrics?.totalRegistrations || 0)}</Text>
              <Text style={styles.overviewLabel}>Total de Inscritos</Text>
            </View>

            {/* Total Revenue */}
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBg, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="cash" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.overviewValue, { color: COLORS.primary }]}>
                {formatCurrency(metrics?.totalRevenue || 0)}
              </Text>
              <Text style={styles.overviewLabel}>Receita Total</Text>
            </View>

            {/* Average Occupancy */}
            <View style={styles.overviewCard}>
              <View style={[styles.overviewIconBg, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.overviewValue}>{metrics?.averageOccupancy || 0}%</Text>
              <Text style={styles.overviewLabel}>Taxa de Ocupação</Text>
            </View>
          </View>
        </View>

        {/* Engagement Metrics */}
        <View style={styles.engagementSection}>
          <Text style={styles.sectionTitle}>Engajamento</Text>
          
          <View style={styles.engagementRow}>
            <View style={styles.engagementCard}>
              <Ionicons name="eye" size={24} color="#6366F1" />
              <Text style={styles.engagementValue}>{formatNumber(metrics?.totalViews || 0)}</Text>
              <Text style={styles.engagementLabel}>👁️ Views</Text>
            </View>
            
            <View style={styles.engagementCard}>
              <Ionicons name="heart" size={24} color="#EF4444" />
              <Text style={styles.engagementValue}>{formatNumber(metrics?.totalLikes || 0)}</Text>
              <Text style={styles.engagementLabel}>❤️ Likes</Text>
            </View>
            
            <View style={styles.engagementCard}>
              <Ionicons name="share-social" size={24} color="#10B981" />
              <Text style={styles.engagementValue}>{formatNumber(metrics?.totalShares || 0)}</Text>
              <Text style={styles.engagementLabel}>🔗 Shares</Text>
            </View>
          </View>
        </View>

        {/* Events Detail */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Métricas por Evento</Text>
          
          {eventMetrics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Nenhum evento encontrado</Text>
              <Text style={styles.emptySubtext}>Crie seu primeiro evento para ver métricas</Text>
            </View>
          ) : (
            eventMetrics.map((event) => (
              <TouchableOpacity 
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail' as any, { eventId: event.id })}
                activeOpacity={0.8}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                    <Text style={styles.eventDate}>{formatDate(event.eventDate)}</Text>
                  </View>
                  <StatusBadge status={event.status} />
                </View>
                
                <View style={styles.eventMetricsGrid}>
                  <View style={styles.eventMetricItem}>
                    <Text style={styles.eventMetricValue}>{event.registrations}</Text>
                    <Text style={styles.eventMetricLabel}>Inscritos</Text>
                  </View>
                  <View style={styles.eventMetricItem}>
                    <Text style={[styles.eventMetricValue, { color: COLORS.primary }]}>
                      {formatCurrency(event.revenue)}
                    </Text>
                    <Text style={styles.eventMetricLabel}>Receita</Text>
                  </View>
                  <View style={styles.eventMetricItem}>
                    <Text style={styles.eventMetricValue}>{event.views}</Text>
                    <Text style={styles.eventMetricLabel}>👁️ Views</Text>
                  </View>
                  <View style={styles.eventMetricItem}>
                    <Text style={styles.eventMetricValue}>{event.likes}</Text>
                    <Text style={styles.eventMetricLabel}>❤️ Likes</Text>
                  </View>
                  <View style={styles.eventMetricItem}>
                    <Text style={styles.eventMetricValue}>{event.shares}</Text>
                    <Text style={styles.eventMetricLabel}>🔗 Shares</Text>
                  </View>
                  <View style={styles.eventMetricItem}>
                    <Text style={styles.eventMetricValue}>{event.conversionRate}%</Text>
                    <Text style={styles.eventMetricLabel}>Conversão</Text>
                  </View>
                </View>
                
                <View style={styles.eventFooter}>
                  <View style={styles.occupancyBar}>
                    <View 
                      style={[
                        styles.occupancyFill, 
                        { width: `${Math.min(event.occupancyRate, 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.occupancyText}>{event.occupancyRate}% ocupação</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        
        <View style={{ height: 100 }} />
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  // Overview Section
  overviewSection: {
    padding: SPACING.lg,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  overviewCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  overviewIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  overviewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  overviewSubStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  overviewSubStat: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Engagement Section
  engagementSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  engagementCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  engagementValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  engagementLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Events Section
  eventsSection: {
    paddingHorizontal: SPACING.lg,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  eventInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  eventMetricItem: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2 - SPACING.sm * 2) / 3,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  eventMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventMetricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  occupancyBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  occupancyText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

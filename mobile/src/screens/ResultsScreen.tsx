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
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api, ResultWithDetails } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
};

interface FormattedResult {
  id: number;
  eventName: string;
  eventDate: string;
  category: string;
  chipTime: string;
  gunTime: string;
  pace: string;
  overallPosition: number;
  totalParticipants: number;
  categoryPosition: number;
  categoryTotal: number;
  ageGroupPosition: number;
  ageGroupTotal: number;
  hasCertificate: boolean;
  certificateUrl?: string;
}

const formatTime = (seconds: number | null): string => {
  if (!seconds) return '--:--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatPace = (secondsPerKm: number | null): string => {
  if (!secondsPerKm) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const secs = secondsPerKm % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function ResultsScreen({ navigation }: ResultsScreenProps) {
  const { showToast } = useToast();
  const [results, setResults] = useState<FormattedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRaces: 0,
    bestTime21k: '--:--:--',
    bestPace: '--:--',
  });

  const loadResults = useCallback(async () => {
    try {
      const data = await api.getMyResults();
      
      const formatted: FormattedResult[] = data.map((item) => ({
        id: item.result.id,
        eventName: item.event?.name || 'Evento',
        eventDate: item.event?.eventDate || new Date().toISOString(),
        category: item.category?.name || 'Categoria',
        chipTime: formatTime(item.result.chipTime),
        gunTime: formatTime(item.result.gunTime),
        pace: formatPace(item.result.avgPace),
        overallPosition: item.result.overallRank || 0,
        totalParticipants: 0,
        categoryPosition: item.result.categoryRank || 0,
        categoryTotal: 0,
        ageGroupPosition: item.result.genderRank || 0,
        ageGroupTotal: 0,
        hasCertificate: !!item.result.certificateUrl,
        certificateUrl: item.result.certificateUrl || undefined,
      }));
      
      setResults(formatted);
      
      // Calculate stats
      if (formatted.length > 0) {
        const userStats = await api.getStats();
        setStats({
          totalRaces: userStats.totalRaces || formatted.length,
          bestTime21k: userStats.bestTime21k ? formatTime(userStats.bestTime21k) : '--:--:--',
          bestPace: formatted.reduce((best, r) => {
            if (r.pace !== '--:--' && (best === '--:--' || r.pace < best)) {
              return r.pace;
            }
            return best;
          }, '--:--'),
        });
      }
    } catch (error) {
      console.error('Error loading results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadResults();
    setIsRefreshing(false);
  };

  const handleShare = async (item: FormattedResult) => {
    try {
      await Share.share({
        message: `🏃 Meu resultado no ${item.eventName}!\n\n⏱️ Tempo: ${item.chipTime}\n📊 Pace: ${item.pace}/km\n🏆 Posição: ${item.overallPosition}º\n\n#SouEsporte #Corrida`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCertificate = (item: FormattedResult) => {
    if (item.certificateUrl) {
      // Open certificate URL
      showToast('O certificado será baixado em breve.', 'info');
    } else {
      showToast('Certificado ainda não disponível para este evento.', 'info');
    }
  };

  const renderResultCard = ({ item }: { item: FormattedResult }) => (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.9}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.dateText}>{formatDate(item.eventDate)}</Text>
            <Text style={styles.categoryText}>• {item.category}</Text>
          </View>
        </View>
        {item.hasCertificate && (
          <TouchableOpacity 
            style={styles.certificateButton}
            onPress={() => handleCertificate(item)}
          >
            <Ionicons name="ribbon" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Time Display */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.timeContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.timeMain}>
          <Text style={styles.timeLabel}>Tempo Chip</Text>
          <Text style={styles.timeValue}>{item.chipTime}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeSecondary}>
          <View style={styles.timeItem}>
            <Text style={styles.timeItemLabel}>Gun Time</Text>
            <Text style={styles.timeItemValue}>{item.gunTime}</Text>
          </View>
          <View style={styles.timeItem}>
            <Text style={styles.timeItemLabel}>Pace</Text>
            <Text style={styles.timeItemValue}>{item.pace}/km</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Positions */}
      <View style={styles.positionsContainer}>
        <View style={styles.positionItem}>
          <View style={styles.positionIcon}>
            <Ionicons name="trophy" size={18} color={COLORS.warning} />
          </View>
          <View style={styles.positionInfo}>
            <Text style={styles.positionLabel}>Geral</Text>
            <Text style={styles.positionValue}>
              {item.overallPosition > 0 ? `${item.overallPosition}º` : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.positionItem}>
          <View style={styles.positionIcon}>
            <Ionicons name="people" size={18} color={COLORS.info} />
          </View>
          <View style={styles.positionInfo}>
            <Text style={styles.positionLabel}>Categoria</Text>
            <Text style={styles.positionValue}>
              {item.categoryPosition > 0 ? `${item.categoryPosition}º` : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.positionItem}>
          <View style={styles.positionIcon}>
            <Ionicons name="fitness" size={18} color={COLORS.success} />
          </View>
          <View style={styles.positionInfo}>
            <Text style={styles.positionLabel}>Gênero</Text>
            <Text style={styles.positionValue}>
              {item.ageGroupPosition > 0 ? `${item.ageGroupPosition}º` : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleShare(item)}
        >
          <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Compartilhar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleCertificate(item)}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Certificado</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando resultados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Resultados</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalRaces}</Text>
          <Text style={styles.statLabel}>Corridas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.bestTime21k}</Text>
          <Text style={styles.statLabel}>Melhor 21K</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.bestPace}</Text>
          <Text style={styles.statLabel}>Melhor Pace</Text>
        </View>
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        renderItem={renderResultCard}
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
            <Ionicons name="trophy-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum resultado</Text>
            <Text style={styles.emptyText}>
              Seus resultados aparecerão aqui após participar de eventos
            </Text>
          </View>
        }
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValue: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  statLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
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
  },
  dateText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  categoryText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  certificateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  timeMain: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    ...FONTS.body5,
    color: 'rgba(255,255,255,0.7)',
  },
  timeValue: {
    ...FONTS.h2,
    color: COLORS.white,
    fontWeight: '700',
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: SPACING.md,
  },
  timeSecondary: {
    flex: 1,
    gap: SPACING.sm,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItemLabel: {
    ...FONTS.body5,
    color: 'rgba(255,255,255,0.7)',
  },
  timeItemValue: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: '600',
  },
  positionsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  positionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.sm,
    borderRadius: SIZES.radius,
    gap: SPACING.xs,
  },
  positionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionInfo: {
    flex: 1,
  },
  positionLabel: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  positionValue: {
    ...FONTS.body4,
    color: COLORS.text,
    fontWeight: '600',
  },
  positionTotal: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  actionButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '600',
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
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import BottomNavigation from '../components/BottomNavigation';
import { api, Event, ResultWithDetails } from '../services/api';

import { useToast } from '../contexts/ToastContext';
type RankingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Ranking'>;
};

interface EventRanking {
  id: number;
  eventName: string;
  eventDate: string;
  category: string;
  results: {
    position: number;
    name: string;
    time: string;
    team?: string;
  }[];
}

const TABS = [
  { id: 'recent', label: 'Recentes' },
  { id: 'my', label: 'Meus Resultados' },
  { id: 'favorites', label: 'Favoritos' },
];

const formatTime = (seconds: number | null): string => {
  if (!seconds) return '--:--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `00:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function RankingScreen({ navigation }: RankingScreenProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('recent');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<EventRanking[]>([]);
  const [myResults, setMyResults] = useState<EventRanking[]>([]);

  const loadRankings = useCallback(async () => {
    try {
      // Load events with results
      const events = await api.getEvents({ status: 'finished' });
      
      const eventRankings: EventRanking[] = [];
      
      for (const event of events.slice(0, 5)) { // Limit to 5 most recent
        try {
          const results = await api.getEventResults(event.id);
          
          if (results.length > 0) {
            // Group by category and get top 3
            const categories = [...new Set(results.map(r => r.category?.name || 'Geral'))];
            
            for (const category of categories.slice(0, 1)) { // Just first category for now
              const categoryResults = results
                .filter(r => (r.category?.name || 'Geral') === category)
                .sort((a, b) => (a.result.overallRank || 999) - (b.result.overallRank || 999))
                .slice(0, 3);
              
              if (categoryResults.length > 0) {
                eventRankings.push({
                  id: event.id,
                  eventName: event.name,
                  eventDate: event.eventDate,
                  category,
                  results: categoryResults.map((r, idx) => ({
                    position: r.result.overallRank || idx + 1,
                    name: r.user?.name || 'Atleta',
                    time: formatTime(r.result.chipTime),
                    team: undefined,
                  })),
                });
              }
            }
          }
        } catch (e) {
          // Skip events without results
        }
      }
      
      setRankings(eventRankings);
    } catch (error) {
      console.error('Error loading rankings:', error);
      setRankings([]);
    }
  }, []);

  const loadMyResults = useCallback(async () => {
    try {
      const results = await api.getMyResults();
      
      // Group by event
      const eventMap = new Map<number, EventRanking>();
      
      for (const r of results) {
        const eventId = r.event?.id || 0;
        if (!eventMap.has(eventId)) {
          eventMap.set(eventId, {
            id: eventId,
            eventName: r.event?.name || 'Evento',
            eventDate: r.event?.eventDate || new Date().toISOString(),
            category: r.category?.name || 'Geral',
            results: [],
          });
        }
        
        const ranking = eventMap.get(eventId)!;
        ranking.results.push({
          position: r.result.overallRank || 0,
          name: 'Você',
          time: formatTime(r.result.chipTime),
        });
      }
      
      setMyResults(Array.from(eventMap.values()));
    } catch (error) {
      console.error('Error loading my results:', error);
      setMyResults([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadRankings(), loadMyResults()]);
      setLoading(false);
    };
    loadData();
  }, [loadRankings, loadMyResults]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadRankings(), loadMyResults()]);
    setIsRefreshing(false);
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1: return '#FFD700'; // Ouro
      case 2: return '#C0C0C0'; // Prata
      case 3: return '#CD7F32'; // Bronze
      default: return COLORS.textMuted;
    }
  };

  const getMedalIcon = (position: number) => {
    if (position <= 3) return 'medal';
    return 'ribbon';
  };

  const handleViewAll = (eventId: number) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'my':
        return myResults;
      case 'favorites':
        return []; // TODO: Implement favorites
      default:
        return rankings;
    }
  };

  const data = getCurrentData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ranking & Resultados</Text>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => showToast('Funcionalidade em breve!', 'info')}
          >
            <Ionicons name="search" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => (
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando resultados...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'my' ? 'Nenhum resultado seu' : 
               activeTab === 'favorites' ? 'Nenhum favorito' : 
               'Nenhum resultado disponível'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'my' ? 'Participe de eventos para ver seus resultados aqui' :
               activeTab === 'favorites' ? 'Adicione eventos aos favoritos para acompanhar' :
               'Os resultados aparecerão aqui após os eventos'}
            </Text>
          </View>
        ) : (
          data.map((event) => (
            <View key={`${event.id}-${event.category}`} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventName}>{event.eventName}</Text>
                  <Text style={styles.eventCategory}>{event.category}</Text>
                </View>
                <View style={styles.eventDateBadge}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.eventDate}>
                    {new Date(event.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>

              {/* Podium */}
              <View style={styles.podium}>
                {event.results.map((result, idx) => (
                  <View key={idx} style={styles.podiumItem}>
                    <View style={[styles.medalContainer, { backgroundColor: getMedalColor(result.position) + '20' }]}>
                      <Ionicons 
                        name={getMedalIcon(result.position) as any} 
                        size={24} 
                        color={getMedalColor(result.position)} 
                      />
                      <Text style={[styles.position, { color: getMedalColor(result.position) }]}>
                        {result.position > 0 ? `${result.position}º` : '--'}
                      </Text>
                    </View>
                    <Text style={styles.athleteName} numberOfLines={1}>{result.name}</Text>
                    <Text style={styles.athleteTime}>{result.time}</Text>
                    {result.team && (
                      <Text style={styles.athleteTeam} numberOfLines={1}>{result.team}</Text>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => handleViewAll(event.id)}
              >
                <Text style={styles.viewAllText}>Ver classificação completa</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation
        activeTab="ranking"
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
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  eventName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  eventDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  eventDate: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  medalContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  position: {
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    marginTop: 2,
  },
  athleteName: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  athleteTime: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  athleteTeam: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

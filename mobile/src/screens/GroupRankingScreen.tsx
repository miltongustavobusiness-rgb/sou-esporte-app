import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GroupRanking'>;

const { width } = Dimensions.get('window');

interface RankingEntry {
  id: number;
  userId: number;
  points: number;
  totalParticipations: number;
  totalDistance: number;
  totalTime: number;
  totalElevation: number;
  totalWins: number;
  totalLosses: number;
  position: number;
  user: {
    id: number;
    name: string;
    username: string;
    photoUrl: string | null;
  };
}

const MODALITIES = [
  { id: 'geral', label: 'Geral', icon: 'trophy-outline', color: '#FFD700' },
  { id: 'corrida', label: 'Corrida', icon: 'walk-outline', color: '#2196F3' },
  { id: 'funcional', label: 'Funcional', icon: 'barbell-outline', color: '#FF5722' },
  { id: 'caminhada_trail', label: 'Trail', icon: 'trail-sign-outline', color: '#4CAF50' },
  { id: 'yoga', label: 'Yoga', icon: 'body-outline', color: '#9C27B0' },
  { id: 'lutas', label: 'Lutas', icon: 'hand-left-outline', color: '#F44336' },
];

const PERIOD_OPTIONS = [
  { id: 'all_time', label: 'Geral' },
  { id: 'month', label: 'Este Mês' },
  { id: 'week', label: 'Esta Semana' },
];

export default function GroupRankingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName, groupType } = route.params;

  const [selectedModality, setSelectedModality] = useState('geral');
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myPosition, setMyPosition] = useState<RankingEntry | null>(null);

  const loadRanking = useCallback(async () => {
    try {
      const result = await apiRequest('groups.getRanking', { 
        groupId, 
        modality: selectedModality,
        period: selectedPeriod,
      });
      setRanking(result.ranking || []);
      setMyPosition(result.myPosition || null);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, selectedModality, selectedPeriod]);

  useEffect(() => {
    setLoading(true);
    loadRanking();
  }, [loadRanking]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRanking();
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return { backgroundColor: '#FFD700', color: '#333' };
      case 2:
        return { backgroundColor: '#C0C0C0', color: '#333' };
      case 3:
        return { backgroundColor: '#CD7F32', color: '#fff' };
      default:
        return { backgroundColor: '#f5f5f5', color: '#666' };
    }
  };

  const getStatLabel = (modality: string) => {
    switch (modality) {
      case 'corrida':
      case 'caminhada_trail':
        return 'Distância';
      case 'funcional':
        return 'Tempo Total';
      case 'yoga':
        return 'Sessões';
      case 'lutas':
        return 'Vitórias';
      default:
        return 'Participações';
    }
  };

  const formatStat = (entry: RankingEntry, modality: string) => {
    switch (modality) {
      case 'corrida':
      case 'caminhada_trail':
        return `${(entry.totalDistance || 0).toFixed(1)} km`;
      case 'funcional':
        const hours = Math.floor((entry.totalTime || 0) / 60);
        const mins = (entry.totalTime || 0) % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      case 'yoga':
        return `${entry.totalParticipations || 0} sessões`;
      case 'lutas':
        return `${entry.totalWins || 0}V / ${entry.totalLosses || 0}D`;
      default:
        return `${entry.totalParticipations || 0}`;
    }
  };

  const renderPodium = () => {
    if (ranking.length < 3) return null;

    const [first, second, third] = ranking.slice(0, 3);

    return (
      <View style={styles.podiumContainer}>
        {/* Second Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumPosition, styles.podiumSecond]}>
            <Text style={styles.podiumPositionText}>2</Text>
          </View>
          <Image
            source={{ uri: second?.user.photoUrl || 'https://via.placeholder.com/60' }}
            style={[styles.podiumPhoto, styles.podiumPhotoSecond]}
          />
          <Text style={styles.podiumName} numberOfLines={1}>
            {second?.user.name.split(' ')[0]}
          </Text>
          <Text style={styles.podiumPoints}>{second?.points} pts</Text>
          <View style={[styles.podiumBar, styles.podiumBarSecond]} />
        </View>

        {/* First Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumPosition, styles.podiumFirst]}>
            <Ionicons name="trophy" size={16} color="#fff" />
          </View>
          <Image
            source={{ uri: first?.user.photoUrl || 'https://via.placeholder.com/70' }}
            style={[styles.podiumPhoto, styles.podiumPhotoFirst]}
          />
          <Text style={styles.podiumName} numberOfLines={1}>
            {first?.user.name.split(' ')[0]}
          </Text>
          <Text style={styles.podiumPoints}>{first?.points} pts</Text>
          <View style={[styles.podiumBar, styles.podiumBarFirst]} />
        </View>

        {/* Third Place */}
        <View style={styles.podiumItem}>
          <View style={[styles.podiumPosition, styles.podiumThird]}>
            <Text style={styles.podiumPositionText}>3</Text>
          </View>
          <Image
            source={{ uri: third?.user.photoUrl || 'https://via.placeholder.com/60' }}
            style={[styles.podiumPhoto, styles.podiumPhotoThird]}
          />
          <Text style={styles.podiumName} numberOfLines={1}>
            {third?.user.name.split(' ')[0]}
          </Text>
          <Text style={styles.podiumPoints}>{third?.points} pts</Text>
          <View style={[styles.podiumBar, styles.podiumBarThird]} />
        </View>
      </View>
    );
  };

  const renderRankingItem = ({ item, index }: { item: RankingEntry; index: number }) => {
    if (index < 3) return null; // Skip top 3, shown in podium

    const positionStyle = getPositionStyle(item.position);

    return (
      <View style={styles.rankingItem}>
        <View style={[styles.positionBadge, { backgroundColor: positionStyle.backgroundColor }]}>
          <Text style={[styles.positionText, { color: positionStyle.color }]}>
            {item.position}
          </Text>
        </View>
        <Image
          source={{ uri: item.user.photoUrl || 'https://via.placeholder.com/40' }}
          style={styles.rankingPhoto}
        />
        <View style={styles.rankingInfo}>
          <Text style={styles.rankingName}>{item.user.name}</Text>
          <Text style={styles.rankingStat}>
            {getStatLabel(selectedModality)}: {formatStat(item, selectedModality)}
          </Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{item.points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  const renderMyPosition = () => {
    if (!myPosition) return null;

    return (
      <View style={styles.myPositionContainer}>
        <View style={styles.myPositionHeader}>
          <Ionicons name="person" size={16} color="#00C853" />
          <Text style={styles.myPositionTitle}>Sua Posição</Text>
        </View>
        <View style={styles.myPositionCard}>
          <View style={[styles.positionBadge, { backgroundColor: '#00C853' }]}>
            <Text style={[styles.positionText, { color: '#fff' }]}>
              {myPosition.position}º
            </Text>
          </View>
          <View style={styles.myPositionInfo}>
            <Text style={styles.myPositionPoints}>{myPosition.points} pontos</Text>
            <Text style={styles.myPositionStat}>
              {formatStat(myPosition, selectedModality)}
            </Text>
          </View>
          {myPosition.position > 1 && (
            <View style={styles.nextGoal}>
              <Text style={styles.nextGoalLabel}>Próximo:</Text>
              <Text style={styles.nextGoalValue}>
                +{(ranking[myPosition.position - 2]?.points || 0) - myPosition.points} pts
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C853" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Ranking</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Modality Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={MODALITIES}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                selectedModality === item.id && { backgroundColor: item.color }
              ]}
              onPress={() => setSelectedModality(item.id)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={18} 
                color={selectedModality === item.id ? '#fff' : item.color} 
              />
              <Text style={[
                styles.tabLabel,
                selectedModality === item.id && styles.tabLabelSelected
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
        />
      </View>

      {/* Period Filter */}
      <View style={styles.periodContainer}>
        {PERIOD_OPTIONS.map(period => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodChip,
              selectedPeriod === period.id && styles.periodChipSelected
            ]}
            onPress={() => setSelectedPeriod(period.id)}
          >
            <Text style={[
              styles.periodLabel,
              selectedPeriod === period.id && styles.periodLabelSelected
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={ranking}
        renderItem={renderRankingItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#00C853']}
          />
        }
        ListHeaderComponent={
          <>
            {renderPodium()}
            {renderMyPosition()}
            {ranking.length > 3 && (
              <Text style={styles.listTitle}>Classificação Completa</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum ranking ainda</Text>
            <Text style={styles.emptyText}>
              Participe de treinos para aparecer no ranking!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoButton: {
    padding: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelSelected: {
    color: '#fff',
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodChipSelected: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  periodLabel: {
    fontSize: 13,
    color: '#666',
  },
  periodLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 20,
    marginBottom: 20,
  },
  podiumItem: {
    alignItems: 'center',
    width: (width - 64) / 3,
  },
  podiumPosition: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumFirst: {
    backgroundColor: '#FFD700',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  podiumSecond: {
    backgroundColor: '#C0C0C0',
  },
  podiumThird: {
    backgroundColor: '#CD7F32',
  },
  podiumPositionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  podiumPhoto: {
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#fff',
    marginBottom: 8,
  },
  podiumPhotoFirst: {
    width: 70,
    height: 70,
    borderColor: '#FFD700',
  },
  podiumPhotoSecond: {
    width: 60,
    height: 60,
    borderColor: '#C0C0C0',
  },
  podiumPhotoThird: {
    width: 60,
    height: 60,
    borderColor: '#CD7F32',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  podiumBar: {
    width: '80%',
    borderRadius: 4,
    marginTop: 8,
  },
  podiumBarFirst: {
    height: 80,
    backgroundColor: '#FFD700',
  },
  podiumBarSecond: {
    height: 60,
    backgroundColor: '#C0C0C0',
  },
  podiumBarThird: {
    height: 40,
    backgroundColor: '#CD7F32',
  },
  myPositionContainer: {
    marginBottom: 20,
  },
  myPositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  myPositionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C853',
  },
  myPositionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00C853',
  },
  myPositionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  myPositionPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  myPositionStat: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  nextGoal: {
    alignItems: 'flex-end',
  },
  nextGoalLabel: {
    fontSize: 11,
    color: '#666',
  },
  nextGoalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C853',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rankingPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 12,
    backgroundColor: '#e0e0e0',
  },
  rankingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  rankingStat: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00C853',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

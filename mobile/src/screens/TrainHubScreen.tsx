import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrainCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}

const TrainCard: React.FC<TrainCardProps> = ({ icon, title, description, color, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.cardIconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon} size={32} color="#FFFFFF" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={24} color="#6B7280" />
  </TouchableOpacity>
);

// Fallback data for recent trainings
const FALLBACK_RECENT_TRAININGS = [
  {
    id: '1',
    title: 'Corrida matinal',
    date: 'Hoje às 06:30',
    distance: '8.2km',
    duration: '42min',
    type: 'individual',
    icon: 'walk' as const,
    color: '#84CC16',
  },
  {
    id: '2',
    title: 'Treino com Lobos Corredores',
    date: 'Ontem às 18:00',
    distance: '10km',
    duration: '52min',
    type: 'group',
    icon: 'people' as const,
    color: '#3B82F6',
  },
];

export default function TrainHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useApp();
  const [recentTrainings, setRecentTrainings] = useState<any[]>(FALLBACK_RECENT_TRAININGS);
  const [stats, setStats] = useState({ trainingsThisMonth: 0, totalDistance: '0km', avgPace: '--:--' });
  const [loading, setLoading] = useState(true);

  // Fetch user's recent trainings and stats from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch trainings
        const myTrainings = await api.getMyTrainings();
        if (myTrainings && myTrainings.length > 0) {
          // Transform API response to match expected format
          const transformed = myTrainings.slice(0, 5).map((t: any) => ({
            id: t.id,
            title: t.title || 'Treino',
            date: t.scheduledAt ? new Date(t.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Data não definida',
            distance: t.distance || '',
            duration: t.duration || '',
            type: t.groupId ? 'group' : 'individual',
            icon: t.groupId ? 'people' : 'walk',
            color: t.groupId ? '#3B82F6' : '#84CC16',
          }));
          setRecentTrainings(transformed);
          console.log('Recent trainings loaded from API:', transformed.length);
          
          // Calculate stats from trainings
          const thisMonth = new Date().getMonth();
          const trainingsThisMonth = myTrainings.filter((t: any) => {
            const trainingDate = new Date(t.scheduledAt);
            return trainingDate.getMonth() === thisMonth;
          }).length;
          
          setStats({
            trainingsThisMonth: trainingsThisMonth || 0,
            totalDistance: myTrainings.reduce((acc: number, t: any) => acc + (parseFloat(t.distance) || 0), 0).toFixed(0) + 'km',
            avgPace: '5:32', // TODO: Calculate from activities when available
          });
        } else {
          // No trainings - set empty stats
          setStats({ trainingsThisMonth: 0, totalDistance: '0km', avgPace: '--:--' });
        }
      } catch (error) {
        console.log('Error fetching trainings, using fallback:', error);
        // Keep fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treinar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="fitness" size={48} color="#84CC16" />
          </View>
          <Text style={styles.heroTitle}>Pronto para treinar?</Text>
          <Text style={styles.heroSubtitle}>
            Encontre treinos, crie atividades em grupo ou inicie uma atividade individual
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          <TrainCard
            icon="location"
            title="Achar treinos perto de mim"
            description="Descubra treinos de grupos próximos à sua localização"
            color="#3B82F6"
            onPress={() => navigation.navigate('DiscoverTrainings' as any)}
          />

          <TrainCard
            icon="people"
            title="Criar treino no meu grupo"
            description="Organize um treino para os membros do seu grupo"
            color="#8B5CF6"
            onPress={() => navigation.navigate('CreateTraining' as any)}
          />

          <TrainCard
            icon="play-circle"
            title="Iniciar atividade"
            description="Comece uma atividade individual ou em grupo agora"
            color="#84CC16"
            onPress={() => navigation.navigate('ActivitySetup' as any)}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Suas estatísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.trainingsThisMonth}</Text>
              <Text style={styles.statLabel}>Treinos este mês</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalDistance}</Text>
              <Text style={styles.statLabel}>Distância total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avgPace}</Text>
              <Text style={styles.statLabel}>Ritmo médio</Text>
            </View>
          </View>
        </View>

        {/* Recent Trainings */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Treinos recentes</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#84CC16" />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : recentTrainings.length > 0 ? (
            recentTrainings.map((training) => (
              <TouchableOpacity 
                key={training.id} 
                style={styles.recentCard}
                onPress={() => navigation.navigate('TrainingDetail' as any, { trainingId: training.id })}
              >
                <View style={[styles.recentIconContainer, { backgroundColor: `${training.color}20` }]}>
                  <Ionicons name={training.icon as any} size={24} color={training.color} />
                </View>
                <View style={styles.recentContent}>
                  <Text style={styles.recentTitle}>{training.title}</Text>
                  <Text style={styles.recentSubtitle}>
                    {training.date}{training.distance ? ` • ${training.distance}` : ''}{training.duration ? ` • ${training.duration}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum treino recente</Text>
              <Text style={styles.emptySubtext}>Comece um treino para ver seu histórico aqui</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#84CC16',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});

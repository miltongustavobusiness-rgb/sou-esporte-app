import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

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

export default function TrainHubScreen() {
  const navigation = useNavigation<NavigationProp>();

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
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Treinos este mês</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>87km</Text>
              <Text style={styles.statLabel}>Distância total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>5:32</Text>
              <Text style={styles.statLabel}>Ritmo médio</Text>
            </View>
          </View>
        </View>

        {/* Recent Trainings */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Treinos recentes</Text>
          <View style={styles.recentCard}>
            <View style={styles.recentIconContainer}>
              <Ionicons name="walk" size={24} color="#84CC16" />
            </View>
            <View style={styles.recentContent}>
              <Text style={styles.recentTitle}>Corrida matinal</Text>
              <Text style={styles.recentSubtitle}>Hoje às 06:30 • 8.2km • 42min</Text>
            </View>
          </View>
          <View style={styles.recentCard}>
            <View style={styles.recentIconContainer}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <View style={styles.recentContent}>
              <Text style={styles.recentTitle}>Treino com Lobos Corredores</Text>
              <Text style={styles.recentSubtitle}>Ontem às 18:00 • 10km • 52min</Text>
            </View>
          </View>
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
});

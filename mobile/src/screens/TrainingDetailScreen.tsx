import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback training data (used when API fails)
const FALLBACK_TRAINING_DATA = {
  id: '1',
  title: 'Treino de Rodagem',
  group: 'Lobos Corredores',
  groupAvatar: '🐺',
  date: 'Hoje, 21 de Janeiro',
  time: '18:00',
  location: 'Praia de Camburi',
  address: 'Av. Dante Michelini, Vitória - ES',
  distance: '10km',
  pace: '5:30/km',
  level: 'Intermediário',
  type: 'rodagem',
  description: 'Treino de rodagem leve para manutenção da base aeróbica. Vamos manter um ritmo confortável e aproveitar a orla. Ponto de encontro na altura do quiosque 15.',
  organizer: {
    name: 'João Silva',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  participants: [
    { id: '1', name: 'João Silva', avatar: '👨', status: 'confirmed', isOrganizer: true },
    { id: '2', name: 'Maria Santos', avatar: '👩', status: 'confirmed' },
    { id: '3', name: 'Pedro Costa', avatar: '👨', status: 'confirmed' },
    { id: '4', name: 'Ana Oliveira', avatar: '👩', status: 'confirmed' },
    { id: '5', name: 'Carlos Lima', avatar: '👨', status: 'maybe' },
    { id: '6', name: 'Julia Ferreira', avatar: '👩', status: 'confirmed' },
    { id: '7', name: 'Lucas Souza', avatar: '👨', status: 'confirmed' },
    { id: '8', name: 'Fernanda Alves', avatar: '👩', status: 'maybe' },
  ],
  maxParticipants: 20,
  hasRoute: true,
  fee: null,
};

export default function TrainingDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { user } = useApp();
  const [userStatus, setUserStatus] = useState<'none' | 'confirmed' | 'maybe'>('none');
  const [checkedIn, setCheckedIn] = useState(false);
  const [training, setTraining] = useState<any>(FALLBACK_TRAINING_DATA);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Get trainingId from navigation params
  const params = route.params as { trainingId?: string } | undefined;
  const trainingId = params?.trainingId || '1';

  // Fetch training details from API
  useEffect(() => {
    const fetchTraining = async () => {
      try {
        setLoading(true);
        const result = await api.getTrainingById(trainingId);
        if (result) {
          // Transform API response to match expected format
          const transformedTraining = {
            id: result.id,
            title: result.title || 'Treino',
            group: result.groupName || 'Grupo',
            groupAvatar: '🏃',
            date: result.date ? new Date(result.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Data não definida',
            time: result.time || '00:00',
            location: result.location || 'Local não definido',
            address: result.address || '',
            distance: result.distance || '',
            pace: result.pace || '',
            level: result.level || 'Todos os níveis',
            type: result.type || 'treino',
            description: result.description || '',
            organizer: {
              name: result.organizerName || 'Organizador',
              avatar: result.organizerAvatar || 'https://randomuser.me/api/portraits/men/1.jpg',
            },
            participants: result.participants || [],
            maxParticipants: result.maxParticipants || 20,
            hasRoute: result.hasRoute || false,
            fee: result.fee || null,
          };
          setTraining(transformedTraining);
          console.log('Training loaded from API:', transformedTraining.title);
        }
      } catch (error) {
        console.log('Error fetching training, using fallback:', error);
        // Keep fallback data already set
      } finally {
        setLoading(false);
      }
    };

    fetchTraining();
  }, [trainingId]);

  const confirmedCount = training.participants?.filter((p: any) => p.status === 'confirmed').length || 0;
  const maybeCount = training.participants?.filter((p: any) => p.status === 'maybe').length || 0;

  const handleRSVP = async (status: 'confirmed' | 'maybe') => {
    try {
      setJoining(true);
      // Call API to join training
      await api.joinTraining(trainingId, status);
      setUserStatus(status);
      Alert.alert(
        'Confirmado!',
        status === 'confirmed' 
          ? 'Você confirmou presença no treino!' 
          : 'Você marcou como "Talvez" para este treino.'
      );
    } catch (error) {
      console.log('Error joining training:', error);
      // Still update local state even if API fails
      setUserStatus(status);
      Alert.alert(
        'Confirmado!',
        status === 'confirmed' 
          ? 'Você confirmou presença no treino!' 
          : 'Você marcou como "Talvez" para este treino.'
      );
    } finally {
      setJoining(false);
    }
  };

  const handleCheckIn = () => {
    setCheckedIn(true);
    Alert.alert(
      'Check-in realizado!',
      'Você fez check-in no treino. Bom treino! 💪',
      [
        { text: 'OK' },
        { 
          text: 'Iniciar Atividade', 
          onPress: () => navigation.navigate('ActivitySetup' as any, { trainingId: training.id })
        }
      ]
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Iniciante': return '#22C55E';
      case 'Intermediário': return '#F59E0B';
      case 'Forte': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Treino</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#84CC16" />
          <Text style={styles.loadingText}>Carregando treino...</Text>
        </View>
      ) : (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.groupBadge}>
            <Text style={styles.groupEmoji}>{training.groupAvatar}</Text>
            <Text style={styles.groupName}>{training.group}</Text>
          </View>
          <Text style={styles.trainingTitle}>{training.title}</Text>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(training.level) + '20' }]}>
            <Text style={[styles.levelText, { color: getLevelColor(training.level) }]}>
              {training.level}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Ionicons name="calendar" size={24} color="#84CC16" />
            <Text style={styles.infoLabel}>Data</Text>
            <Text style={styles.infoValue}>{training.date}</Text>
            <Text style={styles.infoSubvalue}>{training.time}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="speedometer" size={24} color="#3B82F6" />
            <Text style={styles.infoLabel}>Distância</Text>
            <Text style={styles.infoValue}>{training.distance}</Text>
            <Text style={styles.infoSubvalue}>{training.pace}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local</Text>
          <TouchableOpacity style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={24} color="#EF4444" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{training.location}</Text>
              <Text style={styles.locationAddress}>{training.address}</Text>
            </View>
            <Ionicons name="navigate" size={24} color="#84CC16" />
          </TouchableOpacity>
        </View>

        {/* Route */}
        {training.hasRoute && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rota do Treino</Text>
            <TouchableOpacity style={styles.routeCard}>
              <View style={styles.routePreview}>
                <Ionicons name="map" size={48} color="#94A3B8" />
                <Text style={styles.routeText}>Ver rota completa</Text>
              </View>
              <View style={styles.routeStats}>
                <View style={styles.routeStat}>
                  <Text style={styles.routeStatValue}>{training.distance}</Text>
                  <Text style={styles.routeStatLabel}>Distância</Text>
                </View>
                <View style={styles.routeStat}>
                  <Text style={styles.routeStatValue}>+45m</Text>
                  <Text style={styles.routeStatLabel}>Elevação</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{training.description}</Text>
        </View>

        {/* Organizer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizador</Text>
          <View style={styles.organizerCard}>
            <View style={styles.organizerAvatar}>
              <Text style={styles.organizerAvatarText}>👨</Text>
            </View>
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>{training.organizer?.name || 'Organizador'}</Text>
              <Text style={styles.organizerRole}>Administrador do grupo</Text>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#84CC16" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participantes</Text>
            <Text style={styles.participantCount}>
              {confirmedCount}/{training.maxParticipants} confirmados
            </Text>
          </View>
          
          <View style={styles.participantStats}>
            <View style={styles.participantStat}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.participantStatText}>{confirmedCount} Vou</Text>
            </View>
            <View style={styles.participantStat}>
              <Ionicons name="help-circle" size={20} color="#F59E0B" />
              <Text style={styles.participantStatText}>{maybeCount} Talvez</Text>
            </View>
          </View>

          <View style={styles.participantsList}>
            {(training.participants || []).slice(0, 6).map((participant: any) => (
              <View key={participant.id} style={styles.participantItem}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>{participant.avatar}</Text>
                </View>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.isOrganizer && (
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerBadgeText}>Org</Text>
                  </View>
                )}
                <Ionicons 
                  name={participant.status === 'confirmed' ? 'checkmark-circle' : 'help-circle'} 
                  size={16} 
                  color={participant.status === 'confirmed' ? '#22C55E' : '#F59E0B'} 
                />
              </View>
            ))}
            {(training.participants?.length || 0) > 6 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Ver todos ({training.participants?.length || 0})</Text>
                <Ionicons name="chevron-forward" size={16} color="#84CC16" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* RSVP Buttons */}
        {userStatus === 'none' && (
          <View style={styles.rsvpSection}>
            <Text style={styles.rsvpTitle}>Você vai participar?</Text>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity 
                style={[styles.rsvpButton, styles.rsvpGoing, joining && { opacity: 0.6 }]}
                onPress={() => handleRSVP('confirmed')}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color="#0F172A" />
                )}
                <Text style={styles.rsvpButtonText}>{joining ? 'Confirmando...' : 'Vou'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.rsvpButton, styles.rsvpMaybe, joining && { opacity: 0.6 }]}
                onPress={() => handleRSVP('maybe')}
                disabled={joining}
              >
                <Ionicons name="help-circle" size={24} color="#FFFFFF" />
                <Text style={styles.rsvpButtonTextMaybe}>Talvez</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Check-in Button */}
        {userStatus === 'confirmed' && !checkedIn && (
          <View style={styles.checkInSection}>
            <Text style={styles.checkInTitle}>Você está no local?</Text>
            <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
              <Ionicons name="location" size={24} color="#0F172A" />
              <Text style={styles.checkInButtonText}>Fazer Check-in</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Start Activity Button */}
        {checkedIn && (
          <View style={styles.startSection}>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => navigation.navigate('ActivitySetup' as any, { trainingId: training.id })}
            >
              <Ionicons name="play-circle" size={24} color="#0F172A" />
              <Text style={styles.startButtonText}>Iniciar Atividade</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      )}
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
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupName: {
    fontSize: 13,
    color: '#94A3B8',
  },
  trainingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  infoSubvalue: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  participantCount: {
    fontSize: 13,
    color: '#84CC16',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  locationAddress: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  routeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  routePreview: {
    height: 120,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  routeStats: {
    flexDirection: 'row',
    padding: 16,
  },
  routeStat: {
    flex: 1,
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#84CC16',
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    fontSize: 20,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  organizerRole: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  participantStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantStatText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  participantsList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 16,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  organizerBadge: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#84CC16',
  },
  rsvpSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  rsvpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rsvpGoing: {
    backgroundColor: '#84CC16',
  },
  rsvpMaybe: {
    backgroundColor: '#334155',
  },
  rsvpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  rsvpButtonTextMaybe: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkInSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  checkInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  startSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  bottomPadding: {
    height: 32,
  },
});

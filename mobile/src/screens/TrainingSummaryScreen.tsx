import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  Share,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const ACTIVITY_ICONS: Record<string, string> = {
  run: 'walk',
  bike: 'bicycle',
  swim: 'water',
  walk: 'footsteps',
  trail: 'trail-sign',
  gym: 'barbell',
};

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Corrida',
  bike: 'Ciclismo',
  swim: 'Natação',
  walk: 'Caminhada',
  trail: 'Trilha',
  gym: 'Academia',
};

// Gerar coordenadas simuladas para o mapa
const generateRoutePoints = () => {
  const points = [];
  let lat = -20.2976;
  let lng = -40.2958;
  
  for (let i = 0; i < 20; i++) {
    lat += (Math.random() - 0.3) * 0.002;
    lng += (Math.random() - 0.3) * 0.002;
    points.push({ lat, lng });
  }
  return points;
};

export default function TrainingSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as any;
  const { setActiveTraining } = useApp();

  const [caption, setCaption] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);
  const [shareToGroup, setShareToGroup] = useState(true);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const routePoints = useRef(generateRoutePoints()).current;
  const animValue = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  const activityType = params?.activityType || 'run';
  const distance = params?.distance || '5.42';
  const time = params?.time || '28:35';
  const pace = params?.pace || '5:16';
  const calories = params?.calories || 342;
  
  // Métricas adicionais estilo Strava
  const elevation = Math.floor(Math.random() * 150) + 20;
  const avgHeartRate = Math.floor(Math.random() * 30) + 140;
  const maxHeartRate = avgHeartRate + Math.floor(Math.random() * 20) + 10;
  const cadence = Math.floor(Math.random() * 20) + 165;
  const splits = [
    { km: 1, pace: '5:08', elevation: '+12m' },
    { km: 2, pace: '5:22', elevation: '+8m' },
    { km: 3, pace: '5:14', elevation: '-5m' },
    { km: 4, pace: '5:31', elevation: '+15m' },
    { km: 5, pace: '5:11', elevation: '-10m' },
  ];

  const FEELINGS = [
    { id: 'great', emoji: '😄', label: 'Ótimo' },
    { id: 'good', emoji: '🙂', label: 'Bom' },
    { id: 'ok', emoji: '😐', label: 'Ok' },
    { id: 'tired', emoji: '😓', label: 'Cansado' },
    { id: 'bad', emoji: '😣', label: 'Difícil' },
  ];

  useEffect(() => {
    // Animação de entrada
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animação de celebração
    Animated.sequence([
      Animated.delay(500),
      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSave = () => {
    Alert.alert(
      '🎉 Atividade Salva!',
      shareToFeed 
        ? 'Sua atividade foi salva e publicada no feed!' 
        : 'Sua atividade foi salva no seu histórico.',
      [
        { 
          text: 'Ver no Feed', 
          onPress: () => navigation.navigate('Feed' as any)
        }
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Descartar Atividade',
      'Tem certeza que deseja descartar esta atividade? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Descartar', 
          style: 'destructive',
          onPress: () => {
            setActiveTraining(false);
            navigation.navigate('Feed' as any);
          }
        }
      ]
    );
  };

  const handleShare = async (platform: string) => {
    const shareMessage = `🏃 Acabei de completar uma ${ACTIVITY_LABELS[activityType].toLowerCase()}!\n\n📍 ${distance} km\n⏱️ ${time}\n⚡ Pace: ${pace}/km\n🔥 ${calories} kcal\n\n#SouEsporte #Corrida #Fitness`;
    
    try {
      if (platform === 'native') {
        await Share.share({
          message: shareMessage,
          title: 'Minha Atividade - Sou Esporte',
        });
      } else {
        // Para outras plataformas, usar o share nativo
        await Share.share({ message: shareMessage });
      }
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const handleShareImage = () => {
    Alert.alert(
      'Compartilhar como Imagem',
      'Escolha onde deseja compartilhar:',
      [
        { text: 'WhatsApp', onPress: () => handleShare('whatsapp') },
        { text: 'Instagram Stories', onPress: () => handleShare('instagram') },
        { text: 'Mais opções', onPress: () => handleShare('native') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // Renderizar mapa SVG simulado
  const renderMap = () => {
    const minLat = Math.min(...routePoints.map(p => p.lat));
    const maxLat = Math.max(...routePoints.map(p => p.lat));
    const minLng = Math.min(...routePoints.map(p => p.lng));
    const maxLng = Math.max(...routePoints.map(p => p.lng));
    
    const mapWidth = width - 64;
    const mapHeight = 200;
    
    const scaleX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 40) + 20;
    const scaleY = (lat: number) => mapHeight - (((lat - minLat) / (maxLat - minLat)) * (mapHeight - 40) + 20);

    return (
      <View style={styles.mapContainer}>
        {/* Fundo do mapa */}
        <View style={styles.mapBackground}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <View key={`h-${i}`} style={[styles.gridLine, { top: i * (mapHeight / 4) }]} />
          ))}
          {[0, 1, 2, 3, 4].map(i => (
            <View key={`v-${i}`} style={[styles.gridLineVertical, { left: i * (mapWidth / 4) }]} />
          ))}
          
          {/* Rota */}
          <View style={styles.routeContainer}>
            {routePoints.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = routePoints[index - 1];
              const x1 = scaleX(prevPoint.lng);
              const y1 = scaleY(prevPoint.lat);
              const x2 = scaleX(point.lng);
              const y2 = scaleY(point.lat);
              
              const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
              
              return (
                <View
                  key={index}
                  style={[
                    styles.routeLine,
                    {
                      left: x1,
                      top: y1,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
            
            {/* Ponto inicial */}
            <View style={[styles.routePoint, styles.startPoint, { left: scaleX(routePoints[0].lng) - 8, top: scaleY(routePoints[0].lat) - 8 }]}>
              <Ionicons name="flag" size={12} color="#FFFFFF" />
            </View>
            
            {/* Ponto final */}
            <View style={[styles.routePoint, styles.endPoint, { left: scaleX(routePoints[routePoints.length - 1].lng) - 8, top: scaleY(routePoints[routePoints.length - 1].lat) - 8 }]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
        
        {/* Legenda do mapa */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Início</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Fim</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.discardButton}>
          <Text style={styles.discardText}>Descartar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Atividade Concluída</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Celebration Badge */}
        <Animated.View style={[
          styles.celebrationContainer,
          {
            opacity: animValue,
            transform: [{ scale: celebrationAnim }],
          }
        ]}>
          <View style={styles.celebrationBadge}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationText}>Parabéns!</Text>
          </View>
        </Animated.View>

        {/* Activity Type Badge */}
        <View style={styles.activityBadge}>
          <View style={styles.activityIconContainer}>
            <Ionicons name={ACTIVITY_ICONS[activityType] as any} size={28} color="#84CC16" />
          </View>
          <Text style={styles.activityLabel}>{ACTIVITY_LABELS[activityType]}</Text>
          <Text style={styles.activityDate}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Main Stats - Estilo Strava */}
        <View style={styles.mainStats}>
          <View style={styles.primaryStat}>
            <Text style={styles.primaryValue}>{distance}</Text>
            <Text style={styles.primaryLabel}>km</Text>
          </View>
        </View>

        {/* Secondary Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="timer-outline" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{time}</Text>
            <Text style={styles.statLabel}>Tempo</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={22} color="#F59E0B" />
            <Text style={styles.statValue}>{pace}</Text>
            <Text style={styles.statLabel}>Pace Médio</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={22} color="#EF4444" />
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>Calorias</Text>
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.additionalStats}>
          <View style={styles.additionalStatItem}>
            <Ionicons name="trending-up" size={18} color="#84CC16" />
            <Text style={styles.additionalStatValue}>{elevation}m</Text>
            <Text style={styles.additionalStatLabel}>Elevação</Text>
          </View>
          <View style={styles.additionalStatDivider} />
          <View style={styles.additionalStatItem}>
            <Ionicons name="heart" size={18} color="#EF4444" />
            <Text style={styles.additionalStatValue}>{avgHeartRate}</Text>
            <Text style={styles.additionalStatLabel}>BPM Médio</Text>
          </View>
          <View style={styles.additionalStatDivider} />
          <View style={styles.additionalStatItem}>
            <Ionicons name="footsteps" size={18} color="#8B5CF6" />
            <Text style={styles.additionalStatValue}>{cadence}</Text>
            <Text style={styles.additionalStatLabel}>Cadência</Text>
          </View>
        </View>

        {/* Map Section - Estilo Strava */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mapa da Rota</Text>
            <TouchableOpacity style={styles.expandButton}>
              <Ionicons name="expand-outline" size={20} color="#84CC16" />
            </TouchableOpacity>
          </View>
          {renderMap()}
        </View>

        {/* Splits Section - Estilo Strava */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parciais por Km</Text>
          <View style={styles.splitsContainer}>
            <View style={styles.splitsHeader}>
              <Text style={styles.splitsHeaderText}>Km</Text>
              <Text style={styles.splitsHeaderText}>Pace</Text>
              <Text style={styles.splitsHeaderText}>Elevação</Text>
            </View>
            {splits.map((split, index) => (
              <View key={index} style={styles.splitRow}>
                <View style={styles.splitKm}>
                  <Text style={styles.splitKmText}>{split.km}</Text>
                </View>
                <View style={styles.splitPaceContainer}>
                  <View style={[
                    styles.splitPaceBar,
                    { 
                      width: `${(5.5 - parseFloat(split.pace.replace(':', '.'))) / 0.5 * 100}%`,
                      backgroundColor: parseFloat(split.pace.replace(':', '.')) < 5.2 ? '#22C55E' : '#F59E0B'
                    }
                  ]} />
                  <Text style={styles.splitPaceText}>{split.pace}</Text>
                </View>
                <Text style={styles.splitElevation}>{split.elevation}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Heart Rate Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zonas de Frequência Cardíaca</Text>
          <View style={styles.heartRateZones}>
            {[
              { zone: 'Z1', label: 'Recuperação', percent: 5, color: '#94A3B8' },
              { zone: 'Z2', label: 'Aeróbico', percent: 35, color: '#22C55E' },
              { zone: 'Z3', label: 'Tempo', percent: 40, color: '#F59E0B' },
              { zone: 'Z4', label: 'Limiar', percent: 15, color: '#EF4444' },
              { zone: 'Z5', label: 'VO2 Max', percent: 5, color: '#DC2626' },
            ].map((zone, index) => (
              <View key={index} style={styles.zoneRow}>
                <Text style={styles.zoneLabel}>{zone.zone}</Text>
                <View style={styles.zoneBarContainer}>
                  <View style={[styles.zoneBar, { width: `${zone.percent}%`, backgroundColor: zone.color }]} />
                </View>
                <Text style={styles.zonePercent}>{zone.percent}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How are you feeling */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como você está se sentindo?</Text>
          <View style={styles.feelingsContainer}>
            {FEELINGS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.feelingButton, feeling === f.id && styles.feelingButtonSelected]}
                onPress={() => setFeeling(f.id)}
              >
                <Text style={styles.feelingEmoji}>{f.emoji}</Text>
                <Text style={[styles.feelingLabel, feeling === f.id && styles.feelingLabelSelected]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adicionar legenda</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Como foi seu treino? Compartilhe com a comunidade..."
            placeholderTextColor="#64748B"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Share Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compartilhar no App</Text>
          <View style={styles.shareOptions}>
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => setShareToFeed(!shareToFeed)}
            >
              <View style={styles.shareOptionInfo}>
                <Ionicons name="newspaper" size={24} color="#84CC16" />
                <View>
                  <Text style={styles.shareOptionLabel}>Publicar no Feed</Text>
                  <Text style={styles.shareOptionDescription}>Visível para todos os usuários</Text>
                </View>
              </View>
              <View style={[styles.checkbox, shareToFeed && styles.checkboxChecked]}>
                {shareToFeed && <Ionicons name="checkmark" size={16} color="#0F172A" />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareOption, { borderBottomWidth: 0 }]}
              onPress={() => setShareToGroup(!shareToGroup)}
            >
              <View style={styles.shareOptionInfo}>
                <Ionicons name="people" size={24} color="#3B82F6" />
                <View>
                  <Text style={styles.shareOptionLabel}>Compartilhar no Grupo</Text>
                  <Text style={styles.shareOptionDescription}>Lobos Corredores</Text>
                </View>
              </View>
              <View style={[styles.checkbox, shareToGroup && styles.checkboxChecked]}>
                {shareToGroup && <Ionicons name="checkmark" size={16} color="#0F172A" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Share - Estilo Strava */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compartilhar externamente</Text>
          <View style={styles.socialShareContainer}>
            <TouchableOpacity 
              style={styles.shareImageButton}
              onPress={handleShareImage}
            >
              <Ionicons name="image-outline" size={24} color="#FFFFFF" />
              <Text style={styles.shareImageText}>Compartilhar como Imagem</Text>
            </TouchableOpacity>
            
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: '#25D366' }]}
                onPress={() => handleShare('whatsapp')}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: '#E4405F' }]}
                onPress={() => handleShare('instagram')}
              >
                <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: '#1877F2' }]}
                onPress={() => handleShare('facebook')}
              >
                <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}
                onPress={() => handleShare('twitter')}
              >
                <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, { backgroundColor: '#334155' }]}
                onPress={() => handleShare('native')}
              >
                <Ionicons name="share-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity style={styles.saveMainButton} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={24} color="#0F172A" />
            <Text style={styles.saveMainText}>
              {shareToFeed ? 'Salvar e Publicar' : 'Salvar Atividade'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
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
  discardButton: {
    padding: 8,
  },
  discardText: {
    fontSize: 15,
    color: '#EF4444',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#84CC16',
  },
  content: {
    flex: 1,
  },
  celebrationContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  celebrationEmoji: {
    fontSize: 24,
  },
  celebrationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#84CC16',
  },
  activityBadge: {
    alignItems: 'center',
    paddingTop: 16,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityDate: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  mainStats: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  primaryStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  primaryValue: {
    fontSize: 80,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  primaryLabel: {
    fontSize: 28,
    fontWeight: '500',
    color: '#94A3B8',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  additionalStats: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
  },
  additionalStatItem: {
    alignItems: 'center',
  },
  additionalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  additionalStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  additionalStatDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  expandButton: {
    padding: 4,
  },
  mapContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapBackground: {
    height: 200,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#334155',
    opacity: 0.3,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#334155',
    opacity: 0.3,
  },
  routeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#84CC16',
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  routePoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPoint: {
    backgroundColor: '#22C55E',
  },
  endPoint: {
    backgroundColor: '#EF4444',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  splitsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  splitsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  splitsHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  splitKm: {
    width: 40,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitKmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  splitPaceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  splitPaceBar: {
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  splitPaceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  splitElevation: {
    width: 50,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
  },
  heartRateZones: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  zoneLabel: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  zoneBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  zoneBar: {
    height: '100%',
    borderRadius: 6,
  },
  zonePercent: {
    width: 35,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  feelingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feelingButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    minWidth: 60,
  },
  feelingButtonSelected: {
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
    borderWidth: 2,
    borderColor: '#84CC16',
  },
  feelingEmoji: {
    fontSize: 24,
  },
  feelingLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  feelingLabelSelected: {
    color: '#84CC16',
  },
  captionInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  shareOptions: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  shareOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  shareOptionDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#84CC16',
    borderColor: '#84CC16',
  },
  socialShareContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  shareImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  shareImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  saveMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  saveMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomPadding: {
    height: 40,
  },
});

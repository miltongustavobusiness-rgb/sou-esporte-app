import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Modal,
  Share,
  Clipboard,
  Platform,
  Linking,
  Vibration,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock group participants for group mode
const GROUP_MEMBERS = [
  { id: '1', name: 'João Silva', avatar: '👨', phone: '+5527999991111', online: true },
  { id: '2', name: 'Maria Santos', avatar: '👩', phone: '+5527999992222', online: true },
  { id: '3', name: 'Pedro Costa', avatar: '👨', phone: '+5527999993333', online: false },
  { id: '4', name: 'Ana Oliveira', avatar: '👩', phone: '+5527999994444', online: true },
  { id: '5', name: 'Carlos Mendes', avatar: '👨', phone: '+5527999995555', online: true },
];

// Simulated route coordinates
const generateRouteCoordinates = () => {
  const baseCoords = { lat: -20.2976, lng: -40.2958 };
  const coords = [];
  for (let i = 0; i < 50; i++) {
    coords.push({
      lat: baseCoords.lat + (Math.random() - 0.5) * 0.01,
      lng: baseCoords.lng + (Math.random() - 0.5) * 0.01,
    });
  }
  return coords;
};

// Contatos de emergência padrão
const DEFAULT_EMERGENCY_CONTACTS = [
  { id: '1', name: 'SAMU', phone: '192', icon: 'medical', color: '#EF4444' },
  { id: '2', name: 'Bombeiros', phone: '193', icon: 'flame', color: '#F97316' },
  { id: '3', name: 'Polícia', phone: '190', icon: 'shield', color: '#3B82F6' },
];

export default function LiveTrainingMapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as any;
  const { setActiveTraining } = useApp();
  
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState('0:00');
  const [calories, setCalories] = useState(0);
  const [heartRate, setHeartRate] = useState(0);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  
  // Estados para compartilhamento
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [liveShareLink, setLiveShareLink] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState<{lat: number, lng: number}[]>([]);
  const [viewersCount, setViewersCount] = useState(0);
  
  // Estado para modal de confirmação de parar
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  
  // Estados para emergência
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyActivated, setEmergencyActivated] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(5);
  const [groupAlertSent, setGroupAlertSent] = useState(false);
  const [alertedMembers, setAlertedMembers] = useState<string[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shareAnim = useRef(new Animated.Value(0)).current;
  const emergencyAnim = useRef(new Animated.Value(1)).current;
  const groupAlertAnim = useRef(new Animated.Value(0)).current;

  // Definir treino como ativo quando a tela é montada
  useEffect(() => {
    setActiveTraining(true);
    return () => {
      // Não desativa automaticamente - será desativado quando o treino for finalizado
    };
  }, []);

  // Simulate GPS tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setDistance(prev => prev + 0.003 + Math.random() * 0.002);
        setCalories(prev => prev + 0.15);
        setHeartRate(Math.floor(140 + Math.random() * 30));
        
        if (isLiveSharing) {
          setRouteCoordinates(prev => [
            ...prev,
            {
              lat: -20.2976 + (Math.random() - 0.5) * 0.01,
              lng: -40.2958 + (Math.random() - 0.5) * 0.01,
            }
          ]);
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, isPaused, isLiveSharing]);

  // Simular viewers quando compartilhamento live está ativo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLiveSharing) {
      interval = setInterval(() => {
        setViewersCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      }, 5000);
    } else {
      setViewersCount(0);
    }
    
    return () => clearInterval(interval);
  }, [isLiveSharing]);

  // Calculate pace
  useEffect(() => {
    if (distance > 0 && elapsedTime > 0) {
      const paceSeconds = elapsedTime / distance;
      const paceMinutes = Math.floor(paceSeconds / 60);
      const paceRemainder = Math.floor(paceSeconds % 60);
      setPace(`${paceMinutes}:${paceRemainder.toString().padStart(2, '0')}`);
    }
  }, [distance, elapsedTime]);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRunning && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning, isPaused]);

  // Animação para indicador de compartilhamento
  useEffect(() => {
    if (isLiveSharing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shareAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shareAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shareAnim.setValue(0);
    }
  }, [isLiveSharing]);

  // Animação para botão de emergência
  useEffect(() => {
    if (emergencyActivated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(emergencyAnim, {
            toValue: 1.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(emergencyAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      emergencyAnim.setValue(1);
    }
  }, [emergencyActivated]);

  // Animação para alerta de grupo enviado
  useEffect(() => {
    if (groupAlertSent) {
      Animated.sequence([
        Animated.timing(groupAlertAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(groupAlertAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setGroupAlertSent(false));
    }
  }, [groupAlertSent]);

  // Countdown para emergência automática
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (emergencyActivated && emergencyCountdown > 0) {
      Vibration.vibrate([500, 500], true);
      interval = setInterval(() => {
        setEmergencyCountdown(prev => prev - 1);
      }, 1000);
    } else if (emergencyActivated && emergencyCountdown === 0) {
      Vibration.cancel();
      handleEmergencyCall('192');
    }
    
    return () => {
      clearInterval(interval);
      Vibration.cancel();
    };
  }, [emergencyActivated, emergencyCountdown]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    // Abrir modal de confirmação customizado
    setShowStopConfirmModal(true);
  };

  const confirmStopTraining = () => {
    setShowStopConfirmModal(false);
    setIsRunning(false);
    setIsLiveSharing(false);
    setActiveTraining(false);
    navigation.navigate('TrainingSummary' as any, {
      distance: distance.toFixed(2),
      time: formatTime(elapsedTime),
      pace,
      calories: Math.floor(calories),
      activityType: params?.activityType || 'run',
    });
  };

  const handleLock = () => {
    Alert.alert('Tela Bloqueada', 'Deslize para desbloquear');
  };

  // Funções de compartilhamento
  const generateShareLink = () => {
    const uniqueId = Math.random().toString(36).substring(2, 10);
    return `https://souesporte.app/live/${uniqueId}`;
  };

  const handleStartLiveShare = () => {
    const link = generateShareLink();
    setLiveShareLink(link);
    setIsLiveSharing(true);
    setRouteCoordinates(generateRouteCoordinates());
    setViewersCount(Math.floor(Math.random() * 5));
    Alert.alert(
      '🔴 Compartilhamento Live Ativado!',
      'Sua rota está sendo transmitida em tempo real. Amigos e familiares podem acompanhar sua localização.',
      [{ text: 'OK' }]
    );
  };

  const handleStopLiveShare = () => {
    Alert.alert(
      'Parar Compartilhamento',
      'Deseja parar de compartilhar sua rota em tempo real?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Parar', 
          style: 'destructive',
          onPress: () => {
            setIsLiveSharing(false);
            setLiveShareLink('');
            setViewersCount(0);
          }
        }
      ]
    );
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `🏃 Acompanhe meu treino ao vivo!\n\n📍 Distância: ${distance.toFixed(2)}km\n⏱️ Tempo: ${formatTime(elapsedTime)}\n⚡ Pace: ${pace}/km\n\n🔗 ${liveShareLink}`,
        title: 'Meu Treino Live - Sou Esporte',
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(liveShareLink);
    Alert.alert('Link Copiado!', 'O link foi copiado para a área de transferência.');
  };

  const handleShareWhatsApp = async () => {
    const message = `🏃 Acompanhe meu treino ao vivo!\n\n📍 Distância: ${distance.toFixed(2)}km\n⏱️ Tempo: ${formatTime(elapsedTime)}\n⚡ Pace: ${pace}/km\n\n🔗 ${liveShareLink}`;
    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Erro ao compartilhar no WhatsApp:', error);
    }
  };

  const handleShareInstagram = async () => {
    Alert.alert(
      'Compartilhar no Instagram',
      'Copie o link e compartilhe nos Stories ou Direct do Instagram.',
      [
        { text: 'Copiar Link', onPress: handleCopyLink },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  // Funções de Emergência
  const handleEmergencyPress = () => {
    setShowEmergencyModal(true);
  };

  const handleEmergencyCall = async (phone: string) => {
    try {
      const url = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erro', 'Não foi possível realizar a ligação. Disque manualmente: ' + phone);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível realizar a ligação.');
    }
    setEmergencyActivated(false);
    setEmergencyCountdown(5);
  };

  const handleActivateEmergency = () => {
    Alert.alert(
      '🚨 ATIVAR EMERGÊNCIA',
      'Isso irá:\n\n• Pausar seu treino automaticamente\n• Iniciar contagem regressiva de 5 segundos\n• Ligar automaticamente para o SAMU (192)\n• Enviar sua localização para contatos de emergência\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'ATIVAR EMERGÊNCIA', 
          style: 'destructive',
          onPress: () => {
            setIsPaused(true);
            setEmergencyActivated(true);
            setShowEmergencyModal(false);
          }
        }
      ]
    );
  };

  const handleCancelEmergency = () => {
    setEmergencyActivated(false);
    setEmergencyCountdown(5);
    Vibration.cancel();
    Alert.alert('Emergência Cancelada', 'O alerta de emergência foi cancelado.');
  };

  const handleSendLocationToContacts = async () => {
    const locationMessage = `🚨 ALERTA DE EMERGÊNCIA!\n\nPreciso de ajuda!\n\n📍 Minha localização atual:\nhttps://maps.google.com/?q=-20.2976,-40.2958\n\n🏃 Estava treinando:\n• Distância: ${distance.toFixed(2)}km\n• Tempo: ${formatTime(elapsedTime)}\n\nEnviado via Sou Esporte`;
    
    try {
      await Share.share({
        message: locationMessage,
        title: 'EMERGÊNCIA - Sou Esporte',
      });
    } catch (error) {
      console.log('Erro ao compartilhar localização:', error);
    }
  };

  // NOVA FUNÇÃO: Alerta para membros do grupo
  const handleAlertGroupMembers = () => {
    Alert.alert(
      '👥 Alertar Membros do Grupo',
      'Enviar alerta de suporte para todos os membros online do seu grupo?\n\nEles receberão:\n• Notificação push\n• Sua localização atual\n• Opção de entrar em contato',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar Alerta', 
          onPress: () => sendGroupAlert('support')
        }
      ]
    );
  };

  const handleAlertGroupEmergency = () => {
    Alert.alert(
      '🚨 Alerta de Emergência para Grupo',
      'Enviar alerta de EMERGÊNCIA para todos os membros do grupo?\n\nEles receberão:\n• Notificação URGENTE\n• Sua localização em tempo real\n• Pedido para ir ao seu encontro',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'ENVIAR EMERGÊNCIA', 
          style: 'destructive',
          onPress: () => sendGroupAlert('emergency')
        }
      ]
    );
  };

  const sendGroupAlert = async (type: 'support' | 'emergency') => {
    // Simular envio de notificações para membros online
    const onlineMembers = GROUP_MEMBERS.filter(m => m.online);
    setAlertedMembers(onlineMembers.map(m => m.id));
    
    // Vibração de confirmação
    Vibration.vibrate([100, 100, 100]);
    
    // Mostrar feedback visual
    setGroupAlertSent(true);
    
    const alertMessage = type === 'emergency' 
      ? `🚨 EMERGÊNCIA!\n\nPreciso de ajuda URGENTE!\n\n📍 Minha localização:\nhttps://maps.google.com/?q=-20.2976,-40.2958\n\n🏃 Treino atual:\n• Distância: ${distance.toFixed(2)}km\n• Tempo: ${formatTime(elapsedTime)}\n\nPor favor, venham me ajudar!\n\nEnviado via Sou Esporte`
      : `👋 Preciso de Suporte\n\nOlá pessoal! Estou precisando de uma ajuda durante o treino.\n\n📍 Minha localização:\nhttps://maps.google.com/?q=-20.2976,-40.2958\n\n🏃 Treino atual:\n• Distância: ${distance.toFixed(2)}km\n• Tempo: ${formatTime(elapsedTime)}\n\nSe alguém puder vir me encontrar, agradeço!\n\nEnviado via Sou Esporte`;

    // Simular envio (em produção, seria via API/Push Notifications)
    setTimeout(() => {
      Alert.alert(
        type === 'emergency' ? '🚨 Alerta Enviado!' : '✅ Alerta Enviado!',
        `${onlineMembers.length} membro(s) do grupo foram notificados:\n\n${onlineMembers.map(m => `• ${m.name}`).join('\n')}\n\nEles podem ver sua localização e entrar em contato.`,
        [
          { 
            text: 'Compartilhar também via WhatsApp', 
            onPress: async () => {
              try {
                await Share.share({ message: alertMessage });
              } catch (error) {
                console.log('Erro:', error);
              }
            }
          },
          { text: 'OK' }
        ]
      );
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Toast de Alerta Enviado */}
      {groupAlertSent && (
        <Animated.View style={[styles.alertSentToast, { opacity: groupAlertAnim }]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <Text style={styles.alertSentText}>
            Alerta enviado para {alertedMembers.length} membros!
          </Text>
        </Animated.View>
      )}
      
      {/* Overlay de Emergência Ativada */}
      {emergencyActivated && (
        <View style={styles.emergencyOverlay}>
          <Animated.View style={[styles.emergencyCountdownContainer, { transform: [{ scale: emergencyAnim }] }]}>
            <Ionicons name="warning" size={60} color="#FFFFFF" />
            <Text style={styles.emergencyCountdownTitle}>EMERGÊNCIA ATIVADA</Text>
            <Text style={styles.emergencyCountdownNumber}>{emergencyCountdown}</Text>
            <Text style={styles.emergencyCountdownText}>
              Ligando para SAMU em {emergencyCountdown} segundo{emergencyCountdown !== 1 ? 's' : ''}...
            </Text>
            <TouchableOpacity 
              style={styles.cancelEmergencyButton}
              onPress={handleCancelEmergency}
            >
              <Text style={styles.cancelEmergencyText}>CANCELAR</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => navigation.navigate('Feed' as any)}
          >
            <Ionicons name="home" size={20} color="#84CC16" />
          </TouchableOpacity>
          <View style={styles.recordingIndicator}>
            <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recordingText}>
              {isPaused ? 'PAUSADO' : 'GRAVANDO'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {isLiveSharing && (
            <View style={styles.liveIndicator}>
              <Animated.View 
                style={[
                  styles.liveDot, 
                  { opacity: shareAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }
                ]} 
              />
              <Text style={styles.liveText}>LIVE</Text>
              <Text style={styles.viewersText}>{viewersCount} 👁️</Text>
            </View>
          )}
          
          <TouchableOpacity 
            onPress={handleEmergencyPress} 
            style={styles.emergencyHeaderButton}
          >
            <Ionicons name="medkit" size={22} color="#EF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleLock} style={styles.lockButton}>
            <Ionicons name="lock-closed" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="navigate" size={64} color="#84CC16" />
          <Text style={styles.mapText}>Mapa GPS Ativo</Text>
          <Text style={styles.mapSubtext}>Sua rota está sendo gravada</Text>
          
          {isLiveSharing && (
            <View style={styles.sharingBadge}>
              <Ionicons name="radio" size={16} color="#FFFFFF" />
              <Text style={styles.sharingBadgeText}>Transmitindo ao vivo</Text>
            </View>
          )}
        </View>
        
        <View style={styles.gpsIndicator}>
          <Ionicons name="cellular" size={16} color="#22C55E" />
          <Text style={styles.gpsText}>GPS Forte</Text>
        </View>

        <TouchableOpacity 
          style={[styles.shareRouteButton, isLiveSharing && styles.shareRouteButtonActive]}
          onPress={() => setShowShareModal(true)}
        >
          <Ionicons 
            name={isLiveSharing ? "radio" : "share-social"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.shareRouteText}>
            {isLiveSharing ? 'Live' : 'Compartilhar'}
          </Text>
        </TouchableOpacity>

        {params?.mode === 'group' && (
          <TouchableOpacity 
            style={styles.groupToggle}
            onPress={() => setShowGroupPanel(!showGroupPanel)}
          >
            <Ionicons name="people" size={20} color="#FFFFFF" />
            <Text style={styles.groupToggleText}>Grupo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Group Panel */}
      {showGroupPanel && params?.mode === 'group' && (
        <View style={styles.groupPanel}>
          <Text style={styles.groupPanelTitle}>Participantes</Text>
          {GROUP_MEMBERS.slice(0, 3).map(member => (
            <View key={member.id} style={styles.participantRow}>
              <Text style={styles.participantAvatar}>{member.avatar}</Text>
              <Text style={styles.participantName}>{member.name}</Text>
              <View style={[styles.onlineIndicator, { backgroundColor: member.online ? '#22C55E' : '#64748B' }]} />
            </View>
          ))}
        </View>
      )}

      {/* Metrics Panel */}
      <View style={styles.metricsPanel}>
        <View style={styles.primaryMetric}>
          <Text style={styles.primaryValue}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.primaryLabel}>Tempo</Text>
        </View>

        <View style={styles.secondaryMetrics}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{pace}</Text>
            <Text style={styles.metricLabel}>min/km</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{Math.floor(calories)}</Text>
            <Text style={styles.metricLabel}>kcal</Text>
          </View>
        </View>

        {heartRate > 0 && (
          <View style={styles.heartRateContainer}>
            <Ionicons name="heart" size={20} color="#EF4444" />
            <Text style={styles.heartRateValue}>{heartRate}</Text>
            <Text style={styles.heartRateLabel}>bpm</Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
          <View style={[styles.controlIcon, styles.stopIcon]}>
            <Ionicons name="stop" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>Parar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mainControlButton} onPress={handlePause}>
          <View style={[styles.mainControlIcon, isPaused && styles.playIcon]}>
            <Ionicons name={isPaused ? 'play' : 'pause'} size={36} color="#0F172A" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleEmergencyPress}>
          <View style={[styles.controlIcon, styles.emergencyIcon]}>
            <Ionicons name="medkit" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Confirmação de Parar Treino */}
      <Modal
        visible={showStopConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStopConfirmModal(false)}
      >
        <View style={styles.stopModalOverlay}>
          <View style={styles.stopModalContent}>
            <View style={styles.stopModalIconContainer}>
              <Ionicons name="stop-circle" size={60} color="#EF4444" />
            </View>
            <Text style={styles.stopModalTitle}>Finalizar Atividade?</Text>
            <Text style={styles.stopModalDescription}>
              Tem certeza que deseja encerrar este treino? Você será direcionado para a tela de resultados com todas as métricas da sua atividade.
            </Text>
            
            <View style={styles.stopModalStats}>
              <View style={styles.stopModalStatItem}>
                <Text style={styles.stopModalStatValue}>{distance.toFixed(2)}</Text>
                <Text style={styles.stopModalStatLabel}>km</Text>
              </View>
              <View style={styles.stopModalStatDivider} />
              <View style={styles.stopModalStatItem}>
                <Text style={styles.stopModalStatValue}>{formatTime(elapsedTime)}</Text>
                <Text style={styles.stopModalStatLabel}>tempo</Text>
              </View>
              <View style={styles.stopModalStatDivider} />
              <View style={styles.stopModalStatItem}>
                <Text style={styles.stopModalStatValue}>{pace}</Text>
                <Text style={styles.stopModalStatLabel}>pace</Text>
              </View>
            </View>

            <View style={styles.stopModalButtons}>
              <TouchableOpacity 
                style={styles.stopModalCancelButton} 
                onPress={() => setShowStopConfirmModal(false)}
              >
                <Text style={styles.stopModalCancelText}>Continuar Treino</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.stopModalConfirmButton} 
                onPress={confirmStopTraining}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.stopModalConfirmText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Compartilhamento */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compartilhar Treino</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.liveShareStatus}>
              <View style={styles.liveShareIconContainer}>
                <Ionicons 
                  name={isLiveSharing ? "radio" : "radio-outline"} 
                  size={40} 
                  color={isLiveSharing ? "#EF4444" : "#94A3B8"} 
                />
              </View>
              <Text style={styles.liveShareTitle}>
                {isLiveSharing ? '🔴 Transmissão Ativa' : 'Compartilhamento Live'}
              </Text>
              <Text style={styles.liveShareDescription}>
                {isLiveSharing 
                  ? `${viewersCount} pessoa(s) acompanhando sua rota em tempo real`
                  : 'Permita que amigos e familiares acompanhem sua localização durante o treino'
                }
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.liveShareButton, isLiveSharing && styles.liveShareButtonActive]}
              onPress={isLiveSharing ? handleStopLiveShare : handleStartLiveShare}
            >
              <Ionicons 
                name={isLiveSharing ? "stop-circle" : "play-circle"} 
                size={24} 
                color={isLiveSharing ? "#FFFFFF" : "#0F172A"} 
              />
              <Text style={[styles.liveShareButtonText, isLiveSharing && styles.liveShareButtonTextActive]}>
                {isLiveSharing ? 'Parar Transmissão' : 'Iniciar Transmissão Live'}
              </Text>
            </TouchableOpacity>

            {isLiveSharing && (
              <>
                <View style={styles.shareLinkContainer}>
                  <Text style={styles.shareLinkLabel}>Link do seu treino:</Text>
                  <View style={styles.shareLinkBox}>
                    <Text style={styles.shareLinkText} numberOfLines={1}>{liveShareLink}</Text>
                    <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
                      <Ionicons name="copy-outline" size={20} color="#84CC16" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.shareOptionsTitle}>Compartilhar via:</Text>
                <View style={styles.shareOptions}>
                  <TouchableOpacity style={styles.shareOption} onPress={handleShareWhatsApp}>
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' }]}>
                      <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.shareOptionText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.shareOption} onPress={handleShareInstagram}>
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#E4405F' }]}>
                      <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.shareOptionText}>Instagram</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.shareOption} onPress={handleShareLink}>
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="share-social" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.shareOptionText}>Mais</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.shareOption} onPress={handleCopyLink}>
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#6366F1' }]}>
                      <Ionicons name="link" size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.shareOptionText}>Copiar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.currentStats}>
              <Text style={styles.currentStatsTitle}>Estatísticas Atuais</Text>
              <View style={styles.currentStatsRow}>
                <View style={styles.currentStatItem}>
                  <Text style={styles.currentStatValue}>{distance.toFixed(2)}</Text>
                  <Text style={styles.currentStatLabel}>km</Text>
                </View>
                <View style={styles.currentStatItem}>
                  <Text style={styles.currentStatValue}>{formatTime(elapsedTime)}</Text>
                  <Text style={styles.currentStatLabel}>tempo</Text>
                </View>
                <View style={styles.currentStatItem}>
                  <Text style={styles.currentStatValue}>{pace}</Text>
                  <Text style={styles.currentStatLabel}>pace</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Emergência ATUALIZADO */}
      <Modal
        visible={showEmergencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.emergencyModalScroll}>
            <View style={styles.emergencyModalContent}>
              <View style={styles.emergencyModalHeader}>
                <View style={styles.emergencyIconLarge}>
                  <Ionicons name="medkit" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.emergencyModalTitle}>Central de Emergência</Text>
                <Text style={styles.emergencyModalSubtitle}>
                  Escolha o tipo de ajuda que você precisa
                </Text>
              </View>

              {/* NOVA SEÇÃO: Alerta para Grupo */}
              <View style={styles.groupAlertSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={22} color="#84CC16" />
                  <Text style={styles.sectionTitle}>Pedir Ajuda ao Grupo</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Não precisa de ambulância? Peça suporte aos amigos do seu grupo!
                </Text>

                {/* Botão de Suporte do Grupo */}
                <TouchableOpacity 
                  style={styles.groupSupportButton}
                  onPress={handleAlertGroupMembers}
                >
                  <View style={styles.groupSupportIconContainer}>
                    <Ionicons name="hand-left" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.groupSupportTextContainer}>
                    <Text style={styles.groupSupportTitle}>👋 Preciso de Suporte</Text>
                    <Text style={styles.groupSupportSubtitle}>
                      Notificar membros online do grupo
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#84CC16" />
                </TouchableOpacity>

                {/* Botão de Emergência para Grupo */}
                <TouchableOpacity 
                  style={styles.groupEmergencyButton}
                  onPress={handleAlertGroupEmergency}
                >
                  <View style={styles.groupEmergencyIconContainer}>
                    <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.groupSupportTextContainer}>
                    <Text style={styles.groupEmergencyTitle}>🚨 Emergência no Grupo</Text>
                    <Text style={styles.groupEmergencySubtitle}>
                      Alerta urgente + localização em tempo real
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#F59E0B" />
                </TouchableOpacity>

                {/* Membros Online */}
                <View style={styles.onlineMembersContainer}>
                  <Text style={styles.onlineMembersTitle}>
                    {GROUP_MEMBERS.filter(m => m.online).length} membros online agora:
                  </Text>
                  <View style={styles.onlineMembersList}>
                    {GROUP_MEMBERS.filter(m => m.online).map(member => (
                      <View key={member.id} style={styles.onlineMemberChip}>
                        <Text style={styles.onlineMemberAvatar}>{member.avatar}</Text>
                        <Text style={styles.onlineMemberName}>{member.name.split(' ')[0]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Divisor */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Seção de Emergência Oficial */}
              <View style={styles.officialEmergencySection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="call" size={22} color="#EF4444" />
                  <Text style={styles.sectionTitleRed}>Serviços de Emergência</Text>
                </View>

                {/* Botão de Emergência Principal */}
                <TouchableOpacity 
                  style={styles.mainEmergencyButton}
                  onPress={handleActivateEmergency}
                >
                  <Ionicons name="warning" size={28} color="#FFFFFF" />
                  <View style={styles.mainEmergencyButtonText}>
                    <Text style={styles.mainEmergencyTitle}>🚨 EMERGÊNCIA AUTOMÁTICA</Text>
                    <Text style={styles.mainEmergencySubtitle}>
                      Liga para SAMU e envia sua localização
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Serviços de Emergência */}
                <Text style={styles.emergencyServicesTitle}>Ligar diretamente:</Text>
                <View style={styles.emergencyServices}>
                  {DEFAULT_EMERGENCY_CONTACTS.map((contact) => (
                    <TouchableOpacity 
                      key={contact.id}
                      style={styles.emergencyServiceButton}
                      onPress={() => handleEmergencyCall(contact.phone)}
                    >
                      <View style={[styles.emergencyServiceIcon, { backgroundColor: contact.color }]}>
                        <Ionicons name={contact.icon as any} size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.emergencyServiceName}>{contact.name}</Text>
                      <Text style={styles.emergencyServicePhone}>{contact.phone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Enviar Localização */}
              <TouchableOpacity 
                style={styles.sendLocationButton}
                onPress={handleSendLocationToContacts}
              >
                <Ionicons name="location" size={22} color="#FFFFFF" />
                <Text style={styles.sendLocationText}>Enviar Localização para Contatos</Text>
              </TouchableOpacity>

              {/* Informações de Segurança */}
              <View style={styles.safetyInfo}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={styles.safetyInfoText}>
                  Em caso de emergência real, não hesite em usar estas opções. 
                  Sua segurança é prioridade!
                </Text>
              </View>

              {/* Botão Fechar */}
              <TouchableOpacity 
                style={styles.closeEmergencyButton}
                onPress={() => setShowEmergencyModal(false)}
              >
                <Text style={styles.closeEmergencyText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  // Toast de alerta enviado
  alertSentToast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1001,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertSentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Overlay de Emergência
  emergencyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyCountdownContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emergencyCountdownTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
  },
  emergencyCountdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emergencyCountdownText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  cancelEmergencyButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  cancelEmergencyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewersText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  emergencyHeaderButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 20,
  },
  lockButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  sharingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
    gap: 6,
  },
  sharingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gpsIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  gpsText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  shareRouteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  shareRouteButtonActive: {
    backgroundColor: '#EF4444',
  },
  shareRouteText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  groupToggle: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  groupToggleText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  groupPanel: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  groupPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    fontSize: 20,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricsPanel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  primaryMetric: {
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  primaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  secondaryMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#84CC16',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  heartRateValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
  },
  heartRateLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 32,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    backgroundColor: '#EF4444',
  },
  emergencyIcon: {
    backgroundColor: '#F97316',
  },
  controlLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  mainControlButton: {
    alignItems: 'center',
  },
  mainControlIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    backgroundColor: '#22C55E',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveShareStatus: {
    alignItems: 'center',
    marginBottom: 24,
  },
  liveShareIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  liveShareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  liveShareDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  liveShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  liveShareButtonActive: {
    backgroundColor: '#EF4444',
  },
  liveShareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  liveShareButtonTextActive: {
    color: '#FFFFFF',
  },
  shareLinkContainer: {
    marginBottom: 20,
  },
  shareLinkLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  shareLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#84CC16',
  },
  copyButton: {
    padding: 4,
  },
  shareOptionsTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareOption: {
    alignItems: 'center',
  },
  shareOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  currentStats: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
  },
  currentStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  currentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  currentStatItem: {
    alignItems: 'center',
  },
  currentStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#84CC16',
  },
  currentStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  // Emergency Modal Styles - ATUALIZADO
  emergencyModalScroll: {
    maxHeight: '90%',
  },
  emergencyModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  emergencyModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emergencyIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emergencyModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emergencyModalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Seção de Alerta para Grupo
  groupAlertSection: {
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.3)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#84CC16',
  },
  sectionTitleRed: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  groupSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupSupportIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupSupportTextContainer: {
    flex: 1,
  },
  groupSupportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupSupportSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  groupEmergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupEmergencyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupEmergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupEmergencySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  onlineMembersContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10,
    padding: 12,
  },
  onlineMembersTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  onlineMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  onlineMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  onlineMemberAvatar: {
    fontSize: 14,
  },
  onlineMemberName: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  // Divisor
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    fontSize: 14,
    color: '#64748B',
    paddingHorizontal: 16,
  },
  // Seção de Emergência Oficial
  officialEmergencySection: {
    marginBottom: 20,
  },
  mainEmergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 12,
    gap: 16,
  },
  mainEmergencyButtonText: {
    flex: 1,
  },
  mainEmergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mainEmergencySubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  emergencyServicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emergencyServices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emergencyServiceButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  emergencyServiceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emergencyServiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencyServicePhone: {
    fontSize: 18,
    fontWeight: '800',
    color: '#84CC16',
  },
  sendLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  sendLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  safetyInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#F59E0B',
    lineHeight: 20,
  },
  closeEmergencyButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  closeEmergencyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  // Estilos do Modal de Confirmação de Parar
  stopModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stopModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  stopModalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stopModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  stopModalDescription: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stopModalStats: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stopModalStatItem: {
    alignItems: 'center',
  },
  stopModalStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#84CC16',
  },
  stopModalStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  stopModalStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
  stopModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  stopModalCancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopModalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopModalConfirmButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stopModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

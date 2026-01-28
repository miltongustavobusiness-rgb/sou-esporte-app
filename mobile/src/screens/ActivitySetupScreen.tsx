import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ACTIVITY_TYPES = [
  { id: 'run', label: 'Corrida', icon: 'walk', color: '#84CC16' },
  { id: 'bike', label: 'Ciclismo', icon: 'bicycle', color: '#3B82F6' },
  { id: 'swim', label: 'Natação', icon: 'water', color: '#06B6D4' },
  { id: 'walk', label: 'Caminhada', icon: 'footsteps', color: '#F59E0B' },
  { id: 'trail', label: 'Trilha', icon: 'trail-sign', color: '#22C55E' },
  { id: 'gym', label: 'Academia', icon: 'barbell', color: '#8B5CF6' },
];

const GOALS = [
  { id: 'free', label: 'Livre', description: 'Sem meta definida', icon: 'infinite' },
  { id: 'distance', label: 'Distância', description: 'Atingir uma distância', icon: 'resize' },
  { id: 'time', label: 'Tempo', description: 'Treinar por um tempo', icon: 'timer' },
  { id: 'pace', label: 'Ritmo', description: 'Manter um ritmo alvo', icon: 'speedometer' },
];

export default function ActivitySetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const trainingId = (route.params as any)?.trainingId;

  const [activityType, setActivityType] = useState('run');
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const [goal, setGoal] = useState('free');
  const [targetDistance, setTargetDistance] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [targetPace, setTargetPace] = useState('');
  const [enableAudio, setEnableAudio] = useState(true);
  const [enableAutoPause, setEnableAutoPause] = useState(true);

  const handleStartActivity = () => {
    navigation.navigate('LiveTrainingMap' as any, {
      activityType,
      mode,
      goal,
      targetDistance,
      targetTime,
      targetPace,
      trainingId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar Atividade</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Atividade</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.activityCard,
                  activityType === type.id && { borderColor: type.color, backgroundColor: type.color + '15' }
                ]}
                onPress={() => setActivityType(type.id)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={28} 
                  color={activityType === type.id ? type.color : '#94A3B8'} 
                />
                <Text style={[
                  styles.activityLabel,
                  activityType === type.id && { color: type.color }
                ]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeCard, mode === 'individual' && styles.modeCardSelected]}
              onPress={() => setMode('individual')}
            >
              <View style={[styles.modeIcon, mode === 'individual' && styles.modeIconSelected]}>
                <Ionicons name="person" size={28} color={mode === 'individual' ? '#84CC16' : '#94A3B8'} />
              </View>
              <Text style={[styles.modeLabel, mode === 'individual' && styles.modeLabelSelected]}>Individual</Text>
              <Text style={styles.modeDescription}>Treino solo com GPS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modeCard, mode === 'group' && styles.modeCardSelected]}
              onPress={() => setMode('group')}
            >
              <View style={[styles.modeIcon, mode === 'group' && styles.modeIconSelected]}>
                <Ionicons name="people" size={28} color={mode === 'group' ? '#84CC16' : '#94A3B8'} />
              </View>
              <Text style={[styles.modeLabel, mode === 'group' && styles.modeLabelSelected]}>Em Grupo</Text>
              <Text style={styles.modeDescription}>Ver outros participantes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meta do Treino</Text>
          <View style={styles.goalsContainer}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, goal === g.id && styles.goalCardSelected]}
                onPress={() => setGoal(g.id)}
              >
                <Ionicons 
                  name={g.icon as any} 
                  size={24} 
                  color={goal === g.id ? '#84CC16' : '#94A3B8'} 
                />
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalLabel, goal === g.id && styles.goalLabelSelected]}>{g.label}</Text>
                  <Text style={styles.goalDescription}>{g.description}</Text>
                </View>
                {goal === g.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#84CC16" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal Input */}
        {goal === 'distance' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Distância alvo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 10"
                placeholderTextColor="#64748B"
                value={targetDistance}
                onChangeText={setTargetDistance}
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>km</Text>
            </View>
          </View>
        )}

        {goal === 'time' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Tempo alvo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 60"
                placeholderTextColor="#64748B"
                value={targetTime}
                onChangeText={setTargetTime}
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>minutos</Text>
            </View>
          </View>
        )}

        {goal === 'pace' && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Ritmo alvo</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 5:30"
                placeholderTextColor="#64748B"
                value={targetPace}
                onChangeText={setTargetPace}
              />
              <Text style={styles.inputSuffix}>min/km</Text>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          <View style={styles.settingsContainer}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setEnableAudio(!enableAudio)}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high" size={24} color="#3B82F6" />
                <View>
                  <Text style={styles.settingLabel}>Feedback por áudio</Text>
                  <Text style={styles.settingDescription}>Anúncios de km e ritmo</Text>
                </View>
              </View>
              <View style={[styles.toggle, enableAudio && styles.toggleActive]}>
                <View style={[styles.toggleThumb, enableAudio && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setEnableAutoPause(!enableAutoPause)}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="pause-circle" size={24} color="#F59E0B" />
                <View>
                  <Text style={styles.settingLabel}>Pausa automática</Text>
                  <Text style={styles.settingDescription}>Pausar quando parado</Text>
                </View>
              </View>
              <View style={[styles.toggle, enableAutoPause && styles.toggleActive]}>
                <View style={[styles.toggleThumb, enableAutoPause && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Button */}
        <View style={styles.startSection}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartActivity}>
            <Ionicons name="play" size={28} color="#0F172A" />
            <Text style={styles.startButtonText}>Iniciar Atividade</Text>
          </TouchableOpacity>
          <Text style={styles.startHint}>
            O GPS será ativado automaticamente
          </Text>
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityCard: {
    width: '31%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: {
    borderColor: '#84CC16',
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modeIconSelected: {
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modeLabelSelected: {
    color: '#84CC16',
  },
  modeDescription: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  goalsContainer: {
    gap: 10,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#84CC16',
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  goalLabelSelected: {
    color: '#84CC16',
  },
  goalDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#94A3B8',
  },
  settingsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#84CC16',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#94A3B8',
  },
  toggleThumbActive: {
    backgroundColor: '#FFFFFF',
    marginLeft: 'auto',
  },
  startSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  startHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CreateHike'>;

const TRAIL_TYPES = [
  { id: 'urbano', label: 'Urbano', icon: 'business-outline', description: 'Caminhada em ambiente urbano' },
  { id: 'trilha_leve', label: 'Trilha Leve', icon: 'leaf-outline', description: 'Trilha fácil, terreno regular' },
  { id: 'trilha_moderada', label: 'Trilha Moderada', icon: 'trail-sign-outline', description: 'Dificuldade média, alguma elevação' },
  { id: 'trilha_avancada', label: 'Trilha Avançada', icon: 'mountain-outline', description: 'Alta dificuldade, terreno técnico' },
];

export default function CreateHikeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trailType, setTrailType] = useState('urbano');
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [tempDay, setTempDay] = useState(scheduledDate.getDate().toString());
  const [tempMonth, setTempMonth] = useState((scheduledDate.getMonth() + 1).toString());
  const [tempYear, setTempYear] = useState(scheduledDate.getFullYear().toString());
  const [tempHour, setTempHour] = useState(scheduledDate.getHours().toString().padStart(2, '0'));
  const [tempMinute, setTempMinute] = useState(scheduledDate.getMinutes().toString().padStart(2, '0'));

  const openDateModal = () => {
    setTempDay(scheduledDate.getDate().toString());
    setTempMonth((scheduledDate.getMonth() + 1).toString());
    setTempYear(scheduledDate.getFullYear().toString());
    setTempHour(scheduledDate.getHours().toString().padStart(2, '0'));
    setTempMinute(scheduledDate.getMinutes().toString().padStart(2, '0'));
    setShowDateModal(true);
  };

  const confirmDate = () => {
    const day = parseInt(tempDay) || 1;
    const month = parseInt(tempMonth) || 1;
    const year = parseInt(tempYear) || new Date().getFullYear();
    const hour = parseInt(tempHour) || 0;
    const minute = parseInt(tempMinute) || 0;

    const newDate = new Date(year, month - 1, day, hour, minute);
    if (!isNaN(newDate.getTime())) {
      setScheduledDate(newDate);
    }
    setShowDateModal(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Digite um título para a caminhada/trilha');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('mobile.groups.createHike', {
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        trailType: trailType as any,
        distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        elevationGain: elevationGain ? parseInt(elevationGain) : undefined,
        scheduledAt: scheduledDate.toISOString(),
        meetingPoint: meetingPoint.trim() || undefined,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      });

      Alert.alert('Sucesso', 'Caminhada/Trilha criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar caminhada/trilha');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Agendar Caminhada/Trilha</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Trilha do Pico da Bandeira"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descreva a trilha, pontos de interesse, recomendações..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Tipo de Trilha */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Percurso</Text>
          {TRAIL_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.trailTypeCard,
                trailType === type.id && styles.trailTypeCardSelected
              ]}
              onPress={() => setTrailType(type.id)}
            >
              <View style={[
                styles.trailTypeIcon,
                trailType === type.id && styles.trailTypeIconSelected
              ]}>
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={trailType === type.id ? '#1a1a1a' : '#84CC16'} 
                />
              </View>
              <View style={styles.trailTypeInfo}>
                <Text style={[
                  styles.trailTypeLabel,
                  trailType === type.id && styles.trailTypeLabelSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.trailTypeDescription}>{type.description}</Text>
              </View>
              {trailType === type.id && (
                <Ionicons name="checkmark-circle" size={24} color="#84CC16" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Data e Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora</Text>
          <TouchableOpacity style={styles.dateButton} onPress={openDateModal}>
            <Ionicons name="calendar-outline" size={20} color="#84CC16" />
            <Text style={styles.dateButtonText}>{formatDate(scheduledDate)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Distância, Duração, Elevação */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Percurso</Text>
          <View style={styles.statsRow}>
            <View style={styles.statInput}>
              <Ionicons name="navigate-outline" size={20} color="#84CC16" />
              <TextInput
                style={styles.statTextInput}
                placeholder="Distância"
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="decimal-pad"
                placeholderTextColor="#64748B"
              />
              <Text style={styles.statUnit}>km</Text>
            </View>
            <View style={styles.statInput}>
              <Ionicons name="time-outline" size={20} color="#84CC16" />
              <TextInput
                style={styles.statTextInput}
                placeholder="Duração"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="numeric"
                placeholderTextColor="#64748B"
              />
              <Text style={styles.statUnit}>min</Text>
            </View>
            <View style={styles.statInput}>
              <Ionicons name="trending-up-outline" size={20} color="#84CC16" />
              <TextInput
                style={styles.statTextInput}
                placeholder="Elevação"
                value={elevationGain}
                onChangeText={setElevationGain}
                keyboardType="numeric"
                placeholderTextColor="#64748B"
              />
              <Text style={styles.statUnit}>m</Text>
            </View>
          </View>
        </View>

        {/* Ponto de Encontro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ponto de Encontro</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location-outline" size={20} color="#84CC16" />
            <TextInput
              style={styles.locationTextInput}
              placeholder="Ex: Estacionamento do Parque Nacional..."
              value={meetingPoint}
              onChangeText={setMeetingPoint}
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        {/* Limite de Participantes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limite de Participantes</Text>
          <TextInput
            style={styles.input}
            placeholder="Deixe em branco para ilimitado"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="numeric"
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão Criar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="trail-sign" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {loading ? 'Criando...' : 'Agendar Caminhada/Trilha'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}
        >
          <View style={styles.dateModalContent}>
            <Text style={styles.dateModalTitle}>Selecionar Data e Hora</Text>
            
            <View style={styles.dateInputsRow}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Dia</Text>
                <TextInput
                  style={styles.dateInput}
                  value={tempDay}
                  onChangeText={setTempDay}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="DD"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Mês</Text>
                <TextInput
                  style={styles.dateInput}
                  value={tempMonth}
                  onChangeText={setTempMonth}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Ano</Text>
                <TextInput
                  style={styles.dateInput}
                  value={tempYear}
                  onChangeText={setTempYear}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="AAAA"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.timeInputsRow}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Hora</Text>
                <TextInput
                  style={styles.dateInput}
                  value={tempHour}
                  onChangeText={setTempHour}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="HH"
                  placeholderTextColor="#64748B"
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Minuto</Text>
                <TextInput
                  style={styles.dateInput}
                  value={tempMinute}
                  onChangeText={setTempMinute}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.dateModalButtons}>
              <TouchableOpacity 
                style={styles.dateModalCancel}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.dateModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dateModalConfirm}
                onPress={confirmDate}
              >
                <Text style={styles.dateModalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Dark theme colors matching app palette
const COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  cardLight: '#334155',
  primary: '#84CC16',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  trailTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  trailTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#84CC1620',
  },
  trailTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#84CC1620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailTypeIconSelected: {
    backgroundColor: COLORS.primary,
  },
  trailTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trailTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  trailTypeLabelSelected: {
    color: COLORS.primary,
  },
  trailTypeDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statTextInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.cardLight,
  },
  submitButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  dateModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  dateInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timeInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 24,
  },
  dateInputGroup: {
    alignItems: 'center',
  },
  dateInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    minWidth: 70,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  dateModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dateModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dateModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

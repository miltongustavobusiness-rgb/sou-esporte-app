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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'CreateFightTraining'>;

const FIGHT_STYLES = [
  { id: 'jiu_jitsu', label: 'Jiu-Jitsu', icon: '🥋' },
  { id: 'muay_thai', label: 'Muay Thai', icon: '🥊' },
  { id: 'boxe', label: 'Boxe', icon: '🥊' },
  { id: 'judo', label: 'Judô', icon: '🥋' },
  { id: 'karate', label: 'Karatê', icon: '🥋' },
  { id: 'mma', label: 'MMA', icon: '🤼' },
  { id: 'capoeira', label: 'Capoeira', icon: '🎵' },
  { id: 'outro', label: 'Outro', icon: '⚔️' },
];

const BELT_LEVELS = [
  { id: 'branca', label: 'Branca', color: '#fff' },
  { id: 'azul', label: 'Azul', color: '#2196F3' },
  { id: 'roxa', label: 'Roxa', color: '#9C27B0' },
  { id: 'marrom', label: 'Marrom', color: '#795548' },
  { id: 'preta', label: 'Preta', color: '#212121' },
  { id: 'iniciante', label: 'Iniciante', color: '#4CAF50' },
  { id: 'intermediario', label: 'Intermediário', color: '#FF9800' },
  { id: 'avancado', label: 'Avançado', color: '#F44336' },
  { id: 'todos', label: 'Todos', color: '#00C853' },
];

const TRAINING_TYPES = [
  { id: 'tecnica', label: 'Técnica', icon: 'school-outline', description: 'Foco em aprendizado de movimentos' },
  { id: 'sparring_leve', label: 'Sparring Leve', icon: 'hand-left-outline', description: 'Treino controlado, baixa intensidade' },
  { id: 'sparring_intenso', label: 'Sparring Intenso', icon: 'flash-outline', description: 'Simulação de luta real' },
  { id: 'preparacao_fisica', label: 'Prep. Física', icon: 'barbell-outline', description: 'Condicionamento e força' },
  { id: 'competicao', label: 'Competição', icon: 'trophy-outline', description: 'Preparação para campeonatos' },
];

const EQUIPMENT_OPTIONS = [
  'Kimono', 'Luvas de Boxe', 'Caneleiras', 'Protetor Bucal', 
  'Protetor Genital', 'Bandagens', 'Rashguard', 'Shorts de Luta'
];

export default function CreateFightTrainingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fightStyle, setFightStyle] = useState('jiu_jitsu');
  const [trainingType, setTrainingType] = useState('tecnica');
  const [level, setLevel] = useState('todos');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [hasSparring, setHasSparring] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [tempDay, setTempDay] = useState(scheduledDate.getDate().toString());
  const [tempMonth, setTempMonth] = useState((scheduledDate.getMonth() + 1).toString());
  const [tempYear, setTempYear] = useState(scheduledDate.getFullYear().toString());
  const [tempHour, setTempHour] = useState(scheduledDate.getHours().toString().padStart(2, '0'));
  const [tempMinute, setTempMinute] = useState(scheduledDate.getMinutes().toString().padStart(2, '0'));

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipment)
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  };

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Digite um título para o treino');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('mobile.groups.createFightTraining', {
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledDate.toISOString(),
        meetingPoint: meetingPoint.trim() || undefined,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        martialArt: fightStyle,
        trainingType,
        level,
        duration: parseInt(durationMinutes) || 90,
        hasSparring,
        requiredEquipment: selectedEquipment,
      });

      Alert.alert('Sucesso', 'Treino de Lutas criado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar treino');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Treino de Lutas</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Criando...' : 'Criar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino de Jiu-Jitsu - Guardas"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descreva o treino, técnicas que serão trabalhadas..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>

        {/* Data e Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora</Text>
          <TouchableOpacity style={styles.dateButton} onPress={openDateModal}>
            <Ionicons name="calendar-outline" size={20} color="#F44336" />
            <Text style={styles.dateButtonText}>{formatDate(scheduledDate)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Local */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Academia Fight Club"
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            placeholderTextColor="#999"
          />
        </View>

        {/* Arte Marcial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arte Marcial</Text>
          <View style={styles.fightStylesGrid}>
            {FIGHT_STYLES.map(style => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.fightStyleCard,
                  fightStyle === style.id && styles.fightStyleCardSelected
                ]}
                onPress={() => setFightStyle(style.id)}
              >
                <Text style={styles.fightStyleIcon}>{style.icon}</Text>
                <Text style={[
                  styles.fightStyleLabel,
                  fightStyle === style.id && styles.fightStyleLabelSelected
                ]}>
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tipo de Treino */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Treino</Text>
          {TRAINING_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.trainingTypeCard,
                trainingType === type.id && styles.trainingTypeCardSelected
              ]}
              onPress={() => setTrainingType(type.id)}
            >
              <View style={[
                styles.trainingTypeIcon,
                trainingType === type.id && styles.trainingTypeIconSelected
              ]}>
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={trainingType === type.id ? '#fff' : '#F44336'} 
                />
              </View>
              <View style={styles.trainingTypeInfo}>
                <Text style={[
                  styles.trainingTypeLabel,
                  trainingType === type.id && styles.trainingTypeLabelSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.trainingTypeDescription}>{type.description}</Text>
              </View>
              {trainingType === type.id && (
                <Ionicons name="checkmark-circle" size={24} color="#F44336" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Nível */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível / Faixa</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.beltLevelsRow}>
              {BELT_LEVELS.map(belt => (
                <TouchableOpacity
                  key={belt.id}
                  style={[
                    styles.beltCard,
                    level === belt.id && { borderColor: belt.color, borderWidth: 3 }
                  ]}
                  onPress={() => setLevel(belt.id)}
                >
                  <View style={[styles.beltColor, { backgroundColor: belt.color }]} />
                  <Text style={[
                    styles.beltLabel,
                    level === belt.id && styles.beltLabelSelected
                  ]}>
                    {belt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Duração e Participantes */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.sectionTitle}>Duração (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="90"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.sectionTitle}>Máx. Participantes</Text>
            <TextInput
              style={styles.input}
              placeholder="Ilimitado"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Sparring */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Inclui Sparring</Text>
              <Text style={styles.switchDescription}>
                Haverá treino de luta/combate
              </Text>
            </View>
            <Switch
              value={hasSparring}
              onValueChange={setHasSparring}
              trackColor={{ false: '#e0e0e0', true: '#FFCDD2' }}
              thumbColor={hasSparring ? '#F44336' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Equipamentos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipamentos Necessários</Text>
          <View style={styles.tagsContainer}>
            {EQUIPMENT_OPTIONS.map(equipment => (
              <TouchableOpacity
                key={equipment}
                style={[
                  styles.tag,
                  selectedEquipment.includes(equipment) && styles.tagSelected
                ]}
                onPress={() => toggleEquipment(equipment)}
              >
                <Text style={[
                  styles.tagText,
                  selectedEquipment.includes(equipment) && styles.tagTextSelected
                ]}>
                  {equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  submitButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  fightStylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  fightStyleCard: {
    width: '23%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: '1%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  fightStyleCardSelected: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  fightStyleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  fightStyleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  fightStyleLabelSelected: {
    color: '#F44336',
  },
  trainingTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  trainingTypeCardSelected: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  trainingTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingTypeIconSelected: {
    backgroundColor: '#F44336',
  },
  trainingTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trainingTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  trainingTypeLabelSelected: {
    color: '#F44336',
  },
  trainingTypeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  beltLevelsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  beltCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  beltColor: {
    width: 40,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  beltLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  beltLabelSelected: {
    color: '#F44336',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagSelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
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
    color: '#666',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    minWidth: 70,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  dateModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

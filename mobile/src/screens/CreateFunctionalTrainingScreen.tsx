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
type RouteProps = RouteProp<RootStackParamList, 'CreateFunctionalTraining'>;

const TRAINING_TYPES = [
  { id: 'halteres', label: 'Halteres', icon: 'barbell-outline' },
  { id: 'peso_corporal', label: 'Peso Corporal', icon: 'body-outline' },
  { id: 'kettlebell', label: 'Kettlebell', icon: 'fitness-outline' },
  { id: 'misto', label: 'Misto', icon: 'layers-outline' },
];

const FOCUS_OPTIONS = [
  { id: 'forca', label: 'Força', icon: 'flash-outline' },
  { id: 'resistencia', label: 'Resistência', icon: 'timer-outline' },
  { id: 'mobilidade', label: 'Mobilidade', icon: 'move-outline' },
  { id: 'circuito', label: 'Circuito', icon: 'repeat-outline' },
];

const EQUIPMENT_OPTIONS = [
  'Halteres', 'Kettlebell', 'Colchonete', 'Barra', 'Anilhas', 
  'Corda', 'Elástico', 'Medicine Ball', 'Box', 'TRX'
];

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

export default function CreateFunctionalTrainingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trainingType, setTrainingType] = useState('misto');
  const [focus, setFocus] = useState('circuito');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '3', reps: '12', rest: '60', notes: '' }
  ]);
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

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: '3', reps: '12', rest: '60', notes: '' }]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Digite um título para o treino');
      return;
    }

    if (!meetingPoint.trim()) {
      Alert.alert('Erro', 'Digite o local do treino');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('mobile.groups.createFunctionalTraining', {
        groupId,
        title: title.trim(),
        description: description.trim(),
        scheduledAt: scheduledDate.toISOString(),
        meetingPoint: meetingPoint.trim(),
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        trainingType,
        intensity: focus,
        estimatedDuration: parseInt(durationMinutes) || 60,
        exercises: exercises.filter(e => e.name.trim()).map(e => e.name),
        equipment: selectedEquipment,
      });

      Alert.alert('Sucesso', 'Treino funcional criado com sucesso!', [
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
          <Text style={styles.headerTitle}>Treino Funcional</Text>
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
          <Text style={styles.sectionTitle}>Título do Treino *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino de Força - Upper Body"
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
            placeholder="Descreva o treino, objetivos, etc."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>

        {/* Data e Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={openDateModal}>
            <Ionicons name="calendar-outline" size={20} color="#00C853" />
            <Text style={styles.dateButtonText}>{formatDate(scheduledDate)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Local */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Academia CrossFit Centro"
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            placeholderTextColor="#999"
          />
        </View>

        {/* Tipo de Treino */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Treino</Text>
          <View style={styles.optionsGrid}>
            {TRAINING_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  trainingType === type.id && styles.optionCardSelected
                ]}
                onPress={() => setTrainingType(type.id)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={trainingType === type.id ? '#fff' : '#00C853'} 
                />
                <Text style={[
                  styles.optionLabel,
                  trainingType === type.id && styles.optionLabelSelected
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Foco */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foco do Treino</Text>
          <View style={styles.optionsGrid}>
            {FOCUS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  focus === option.id && styles.optionCardSelected
                ]}
                onPress={() => setFocus(option.id)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={focus === option.id ? '#fff' : '#00C853'} 
                />
                <Text style={[
                  styles.optionLabel,
                  focus === option.id && styles.optionLabelSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duração e Participantes */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.sectionTitle}>Duração (min)</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
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

        {/* Exercícios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercícios</Text>
            <TouchableOpacity onPress={addExercise} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#00C853" />
            </TouchableOpacity>
          </View>
          
          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>Exercício {index + 1}</Text>
                {exercises.length > 1 && (
                  <TouchableOpacity onPress={() => removeExercise(index)}>
                    <Ionicons name="trash-outline" size={20} color="#FF5252" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.exerciseInput}
                placeholder="Nome do exercício"
                value={exercise.name}
                onChangeText={(value) => updateExercise(index, 'name', value)}
                placeholderTextColor="#999"
              />
              <View style={styles.exerciseRow}>
                <View style={styles.exerciseField}>
                  <Text style={styles.exerciseLabel}>Séries</Text>
                  <TextInput
                    style={styles.exerciseSmallInput}
                    value={exercise.sets}
                    onChangeText={(value) => updateExercise(index, 'sets', value)}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.exerciseField}>
                  <Text style={styles.exerciseLabel}>Reps</Text>
                  <TextInput
                    style={styles.exerciseSmallInput}
                    value={exercise.reps}
                    onChangeText={(value) => updateExercise(index, 'reps', value)}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.exerciseField}>
                  <Text style={styles.exerciseLabel}>Descanso (s)</Text>
                  <TextInput
                    style={styles.exerciseSmallInput}
                    value={exercise.rest}
                    onChangeText={(value) => updateExercise(index, 'rest', value)}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>
          ))}
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
    backgroundColor: '#00C853',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionCardSelected: {
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  optionLabelSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
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
    backgroundColor: '#00C853',
    borderColor: '#00C853',
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C853',
  },
  exerciseInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseField: {
    flex: 1,
  },
  exerciseLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  exerciseSmallInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
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
    backgroundColor: '#00C853',
    alignItems: 'center',
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

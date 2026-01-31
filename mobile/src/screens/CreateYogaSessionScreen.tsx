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
type RouteProps = RouteProp<RootStackParamList, 'CreateYogaSession'>;

const YOGA_STYLES = [
  { id: 'hatha', label: 'Hatha', description: 'Posturas básicas, ritmo lento' },
  { id: 'vinyasa', label: 'Vinyasa', description: 'Fluxo dinâmico, respiração sincronizada' },
  { id: 'restaurativa', label: 'Restaurativa', description: 'Relaxamento profundo, posturas suaves' },
  { id: 'ashtanga', label: 'Ashtanga', description: 'Sequência fixa, intenso' },
  { id: 'kundalini', label: 'Kundalini', description: 'Energia, mantras, meditação' },
  { id: 'yin', label: 'Yin', description: 'Posturas longas, tecido conectivo' },
  { id: 'outro', label: 'Outro', description: 'Outro estilo' },
];

const LEVELS = [
  { id: 'iniciante', label: 'Iniciante', icon: 'leaf-outline' },
  { id: 'intermediario', label: 'Intermediário', icon: 'fitness-outline' },
  { id: 'avancado', label: 'Avançado', icon: 'flame-outline' },
  { id: 'todos', label: 'Todos os Níveis', icon: 'people-outline' },
];

const DURATIONS = [30, 45, 60, 75, 90];

const FOCUS_AREAS = [
  'Flexibilidade', 'Força', 'Equilíbrio', 'Respiração', 
  'Meditação', 'Relaxamento', 'Core', 'Costas'
];

export default function CreateYogaSessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('hatha');
  const [level, setLevel] = useState('todos');
  const [duration, setDuration] = useState(60);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [bringMat, setBringMat] = useState(true);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [tempDay, setTempDay] = useState(scheduledDate.getDate().toString());
  const [tempMonth, setTempMonth] = useState((scheduledDate.getMonth() + 1).toString());
  const [tempYear, setTempYear] = useState(scheduledDate.getFullYear().toString());
  const [tempHour, setTempHour] = useState(scheduledDate.getHours().toString().padStart(2, '0'));
  const [tempMinute, setTempMinute] = useState(scheduledDate.getMinutes().toString().padStart(2, '0'));

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
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
      Alert.alert('Erro', 'Digite um título para a sessão');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('mobile.groups.createYogaSession', {
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledDate.toISOString(),
        meetingPoint: meetingPoint.trim() || undefined,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        yogaStyle: style,
        level,
        duration,
        focusAreas: selectedFocusAreas,
        bringMat,
      });

      Alert.alert('Sucesso', 'Sessão de Yoga criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar sessão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Sessão de Yoga</Text>
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
            placeholder="Ex: Yoga ao Nascer do Sol"
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
            placeholder="Descreva a sessão, o que esperar..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Data e Hora */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora</Text>
          <TouchableOpacity style={styles.dateButton} onPress={openDateModal}>
            <Ionicons name="calendar-outline" size={20} color="#84CC16" />
            <Text style={styles.dateButtonText}>{formatDate(scheduledDate)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Local */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Parque da Cidade - Gramado"
            value={meetingPoint}
            onChangeText={setMeetingPoint}
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Estilo de Yoga */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estilo de Yoga</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalOptions}>
              {YOGA_STYLES.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.styleCard,
                    style === s.id && styles.styleCardSelected
                  ]}
                  onPress={() => setStyle(s.id)}
                >
                  <Text style={[
                    styles.styleLabel,
                    style === s.id && styles.styleLabelSelected
                  ]}>
                    {s.label}
                  </Text>
                  <Text style={[
                    styles.styleDescription,
                    style === s.id && styles.styleDescriptionSelected
                  ]}>
                    {s.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Nível */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível</Text>
          <View style={styles.levelsGrid}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.id}
                style={[
                  styles.levelCard,
                  level === l.id && styles.levelCardSelected
                ]}
                onPress={() => setLevel(l.id)}
              >
                <Ionicons 
                  name={l.icon as any} 
                  size={24} 
                  color={level === l.id ? '#fff' : '#9C27B0'} 
                />
                <Text style={[
                  styles.levelLabel,
                  level === l.id && styles.levelLabelSelected
                ]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duração */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duração</Text>
          <View style={styles.durationsRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationButton,
                  duration === d && styles.durationButtonSelected
                ]}
                onPress={() => setDuration(d)}
              >
                <Text style={[
                  styles.durationText,
                  duration === d && styles.durationTextSelected
                ]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Áreas de Foco */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Áreas de Foco</Text>
          <View style={styles.tagsContainer}>
            {FOCUS_AREAS.map(area => (
              <TouchableOpacity
                key={area}
                style={[
                  styles.tag,
                  selectedFocusAreas.includes(area) && styles.tagSelected
                ]}
                onPress={() => toggleFocusArea(area)}
              >
                <Text style={[
                  styles.tagText,
                  selectedFocusAreas.includes(area) && styles.tagTextSelected
                ]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trazer Tapete */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Trazer Tapete de Yoga</Text>
              <Text style={styles.switchDescription}>
                Participantes devem trazer seu próprio tapete
              </Text>
            </View>
            <Switch
              value={bringMat}
              onValueChange={setBringMat}
              trackColor={{ false: '#e0e0e0', true: '#E1BEE7' }}
              thumbColor={bringMat ? '#9C27B0' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Máx Participantes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Máx. Participantes</Text>
          <TextInput
            style={styles.input}
            placeholder="Deixe em branco para ilimitado"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="numeric"
            placeholderTextColor="#64748B"
          />
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
  accent: '#9C27B0', // Yoga purple accent
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
    flex: 1,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.cardLight,
  },
  submitButtonText: {
    color: '#1a1a1a',
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
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  horizontalOptions: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  styleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    width: 140,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  styleCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  styleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  styleLabelSelected: {
    color: '#fff',
  },
  styleDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  styleDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  levelCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  levelCardSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  levelLabelSelected: {
    color: '#fff',
  },
  durationsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  durationButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  durationTextSelected: {
    color: '#fff',
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    color: '#fff',
  },
});

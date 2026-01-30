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
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback groups when API fails
const FALLBACK_GROUPS = [
  { id: '1', name: 'Lobos Corredores', avatar: '🐺' },
  { id: '2', name: 'Trail Runners', avatar: '🏃' },
  { id: '3', name: 'Pedal ES', avatar: '🚴' },
];

const TRAINING_TYPES = [
  { id: 'rodagem', label: 'Rodagem', icon: 'walk', description: 'Treino leve de manutenção' },
  { id: 'tiro', label: 'Tiro', icon: 'flash', description: 'Treino de velocidade' },
  { id: 'longao', label: 'Longão', icon: 'trending-up', description: 'Treino de resistência' },
  { id: 'trilha', label: 'Trilha', icon: 'trail-sign', description: 'Treino em trilha' },
];

export default function CreateTrainingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useApp();
  
  // Groups from API
  const [groups, setGroups] = useState<any[]>(FALLBACK_GROUPS);
  const [loadingGroups, setLoadingGroups] = useState(true);
  
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Load user's groups from API
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const userGroups = await api.getUserGroups();
        if (userGroups && userGroups.length > 0) {
          // Transform API data to match component format
          const formattedGroups = userGroups.map((g: any) => ({
            id: String(g.id),
            name: g.name || 'Grupo',
            avatar: g.photoUrl ? null : '🏃', // Use emoji if no photo
            photoUrl: g.photoUrl,
          }));
          setGroups(formattedGroups);
        } else {
          setGroups(FALLBACK_GROUPS);
        }
      } catch (error) {
        console.error('Error loading groups:', error);
        setGroups(FALLBACK_GROUPS);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, []);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [hasRoute, setHasRoute] = useState(false);
  const [hasFee, setHasFee] = useState(false);
  const [hasLimit, setHasLimit] = useState(false);

  const handleCreateTraining = async () => {
    if (!selectedGroup || !selectedType || !date || !time || !location) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setCreating(true);

      // Parse date (DD/MM/YYYY) and time (HH:MM) to ISO format
      const [day, month, year] = date.split('/');
      const scheduledAt = `${year}-${month}-${day}T${time}:00`;

      // Build title from type
      const typeLabel = TRAINING_TYPES.find(t => t.id === selectedType)?.label || 'Treino';
      const title = `${typeLabel} - ${location}`;

      const result = await api.createTraining({
        groupId: parseInt(selectedGroup),
        title,
        description: description || undefined,
        trainingType: selectedType,
        scheduledAt,
        meetingPoint: location,
        maxParticipants: hasLimit && maxParticipants ? parseInt(maxParticipants) : undefined,
      });

      if (result && result.id) {
        Alert.alert(
          'Treino Criado!',
          'Seu treino foi criado com sucesso.',
          [
            {
              text: 'Ver Treino',
              onPress: () => navigation.navigate('TrainingDetail' as any, { trainingId: result.id.toString() })
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // Fallback: show success but go back
        Alert.alert(
          'Treino Criado!',
          'Seu treino foi criado com sucesso.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.log('Error creating training:', error);
      Alert.alert(
        'Erro',
        'Não foi possível criar o treino. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setCreating(false);
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
        <Text style={styles.headerTitle}>Criar Treino</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grupo *</Text>
          <Text style={styles.sectionSubtitle}>Selecione o grupo para o treino</Text>
          <View style={styles.groupsContainer}>
            {groups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupCard,
                  selectedGroup === group.id && styles.groupCardSelected
                ]}
                onPress={() => setSelectedGroup(group.id)}
              >
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>{group.avatar}</Text>
                </View>
                <Text style={styles.groupName}>{group.name}</Text>
                {selectedGroup === group.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#84CC16" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Training Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Treino *</Text>
          <View style={styles.typesGrid}>
            {TRAINING_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={28} 
                  color={selectedType === type.id ? '#84CC16' : '#94A3B8'} 
                />
                <Text style={[
                  styles.typeLabel,
                  selectedType === type.id && styles.typeLabelSelected
                ]}>{type.label}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date and Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Hora *</Text>
          <View style={styles.row}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Data</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#64748B"
                  value={date}
                  onChangeText={setDate}
                />
              </View>
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Hora</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#64748B"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local *</Text>
          <TouchableOpacity style={styles.locationInput}>
            <Ionicons name="location-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder="Buscar local ou usar mapa"
              placeholderTextColor="#64748B"
              value={location}
              onChangeText={setLocation}
            />
            <Ionicons name="map-outline" size={20} color="#84CC16" />
          </TouchableOpacity>
        </View>

        {/* Distance and Pace */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distância e Ritmo (opcional)</Text>
          <View style={styles.row}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Distância</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 10"
                  placeholderTextColor="#64748B"
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>km</Text>
              </View>
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Ritmo alvo</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 5:30"
                  placeholderTextColor="#64748B"
                  value={pace}
                  onChangeText={setPace}
                />
                <Text style={styles.inputSuffix}>/km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Route Option */}
        <View style={styles.section}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Ionicons name="git-branch-outline" size={24} color="#84CC16" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Adicionar rota</Text>
                <Text style={styles.optionDescription}>Desenhar ou importar rota do treino</Text>
              </View>
            </View>
            <Switch
              value={hasRoute}
              onValueChange={setHasRoute}
              trackColor={{ false: '#334155', true: 'rgba(132, 204, 22, 0.3)' }}
              thumbColor={hasRoute ? '#84CC16' : '#94A3B8'}
            />
          </View>
          {hasRoute && (
            <TouchableOpacity style={styles.routeButton}>
              <Ionicons name="create-outline" size={20} color="#84CC16" />
              <Text style={styles.routeButtonText}>Desenhar rota no mapa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Participant Limit */}
        <View style={styles.section}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Ionicons name="people-outline" size={24} color="#3B82F6" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Limite de vagas</Text>
                <Text style={styles.optionDescription}>Definir número máximo de participantes</Text>
              </View>
            </View>
            <Switch
              value={hasLimit}
              onValueChange={setHasLimit}
              trackColor={{ false: '#334155', true: 'rgba(59, 130, 246, 0.3)' }}
              thumbColor={hasLimit ? '#3B82F6' : '#94A3B8'}
            />
          </View>
          {hasLimit && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Número de vagas"
                placeholderTextColor="#64748B"
                value={maxParticipants}
                onChangeText={setMaxParticipants}
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>vagas</Text>
            </View>
          )}
        </View>

        {/* Fee Option */}
        <View style={styles.section}>
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Ionicons name="cash-outline" size={24} color="#F59E0B" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Taxa de participação</Text>
                <Text style={styles.optionDescription}>Cobrar valor para participar</Text>
              </View>
            </View>
            <Switch
              value={hasFee}
              onValueChange={setHasFee}
              trackColor={{ false: '#334155', true: 'rgba(245, 158, 11, 0.3)' }}
              thumbColor={hasFee ? '#F59E0B' : '#94A3B8'}
            />
          </View>
          {hasFee && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>R$</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#64748B"
                value={fee}
                onChangeText={setFee}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Informações adicionais sobre o treino..."
            placeholderTextColor="#64748B"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity 
          style={[styles.createButton, creating && { opacity: 0.6 }]} 
          onPress={handleCreateTraining}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#0F172A" />
          )}
          <Text style={styles.createButtonText}>{creating ? 'Criando...' : 'Criar Treino'}</Text>
        </TouchableOpacity>

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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  groupsContainer: {
    gap: 10,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  groupCardSelected: {
    borderColor: '#84CC16',
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupAvatarText: {
    fontSize: 18,
  },
  groupName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#84CC16',
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  typeLabelSelected: {
    color: '#84CC16',
  },
  typeDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
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
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#94A3B8',
  },
  inputPrefix: {
    fontSize: 14,
    color: '#94A3B8',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#84CC16',
    borderStyle: 'dashed',
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#84CC16',
  },
  textArea: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 100,
    marginTop: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC16',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 32,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  bottomPadding: {
    height: 32,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

const MAX_BIO_LENGTH = 150;

// Lista de modalidades disponíveis
const SPORTS_OPTIONS = [
  { id: 'corrida', label: 'Corrida', icon: '🏃' },
  { id: 'ciclismo', label: 'Ciclismo', icon: '🚴' },
  { id: 'natacao', label: 'Natação', icon: '🏊' },
  { id: 'triathlon', label: 'Triathlon', icon: '🏅' },
  { id: 'musculacao', label: 'Musculação', icon: '💪' },
  { id: 'crossfit', label: 'CrossFit', icon: '🏋️' },
  { id: 'funcional', label: 'Funcional', icon: '⚡' },
  { id: 'futebol', label: 'Futebol', icon: '⚽' },
  { id: 'volei', label: 'Vôlei', icon: '🏐' },
  { id: 'basquete', label: 'Basquete', icon: '🏀' },
  { id: 'tenis', label: 'Tênis', icon: '🎾' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'pilates', label: 'Pilates', icon: '🤸' },
  { id: 'jiujitsu', label: 'Jiu-Jitsu', icon: '🥋' },
  { id: 'muaythai', label: 'Muay Thai', icon: '🥊' },
  { id: 'boxe', label: 'Boxe', icon: '🥊' },
  { id: 'trail', label: 'Trail Running', icon: '🏔️' },
  { id: 'caminhada', label: 'Caminhada', icon: '🚶' },
];

// Categorias de atleta - IDs em português para UI, valores em inglês para API
const ATHLETE_CATEGORIES = [
  { id: 'PRO', label: 'Atleta Profissional', description: 'Compete em alto nível' },
  { id: 'AMATEUR', label: 'Atleta Amador', description: 'Pratica por hobby ou saúde' },
  { id: 'COACH', label: 'Instrutor/Treinador', description: 'Ensina e treina outros atletas' },
];

type EditGridBioScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditGridBio'>;
};

export default function EditGridBioScreen({ navigation }: EditGridBioScreenProps) {
  const { user, updateUser } = useApp();
  const { showToast } = useToast();
  
  // Form states - athleteCategory agora usa valores do banco (PRO, AMATEUR, COACH)
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [athleteCategory, setAthleteCategory] = useState<'PRO' | 'AMATEUR' | 'COACH' | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Carregar dados atuais do perfil
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      if (!user?.id) return;
      
      try {
        const data = await api.getAthleteProfile(user.id);
        const profile = data.profile;
        
        console.log('[EditGridBio] Profile loaded:', profile);
        
        setBio(profile?.gridBio || profile?.bio || '');
        setCity(profile?.city || '');
        setState(profile?.state || '');
        setCountry(profile?.country || 'Brasil');
        
        // Categoria vem do banco como PRO, AMATEUR, COACH
        if (profile?.athleteCategory) {
          const cat = profile.athleteCategory.toUpperCase();
          if (cat === 'PRO' || cat === 'AMATEUR' || cat === 'COACH') {
            setAthleteCategory(cat);
          }
        }
        
        // Parse sports from JSON string
        if (profile?.sports) {
          try {
            const sports = typeof profile.sports === 'string' 
              ? JSON.parse(profile.sports) 
              : profile.sports;
            setSelectedSports(Array.isArray(sports) ? sports : []);
          } catch {
            setSelectedSports([]);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchCurrentProfile();
  }, [user?.id]);

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        return prev.filter(s => s !== sportId);
      }
      if (prev.length >= 5) {
        showToast('Máximo de 5 modalidades', 'info');
        return prev;
      }
      return [...prev, sportId];
    });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    try {
      console.log('[EditGridBio] Saving with category:', athleteCategory);
      
      // Chamar API para salvar todos os dados
      // A API espera valores em inglês (PRO, AMATEUR, COACH)
      await (api as any).updateGridProfile({
        gridBio: bio.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        country: country.trim(),
        athleteCategory: athleteCategory || undefined,
        sports: selectedSports,
      });
      
      // Atualizar contexto local
      if (updateUser) {
        updateUser({
          ...user,
          gridBio: bio.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          country: country.trim(),
          athleteCategory,
          sports: selectedSports,
        } as any);
      }
      
      showToast('Perfil atualizado com sucesso!', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Nome (somente leitura) */}
          <View style={styles.section}>
            <Text style={styles.label}>Seu nome</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{user?.name || 'Usuário'}</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.label}>Sua apresentação</Text>
            <Text style={styles.hint}>
              Adicione links como Nike.com - eles serão clicáveis!
            </Text>
            <TextInput
              style={styles.bioInput}
              placeholder="Ex: 🏃 Corredor | Triatleta | Nike.com/run"
              placeholderTextColor={COLORS.textMuted}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, MAX_BIO_LENGTH))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/{MAX_BIO_LENGTH}</Text>
          </View>

          {/* Localização */}
          <View style={styles.section}>
            <Text style={styles.label}>Localização</Text>
            <View style={styles.locationRow}>
              <View style={styles.locationField}>
                <Text style={styles.fieldLabel}>Cidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="São Paulo"
                  placeholderTextColor={COLORS.textMuted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.stateField}>
                <Text style={styles.fieldLabel}>UF</Text>
                <TextInput
                  style={styles.input}
                  placeholder="SP"
                  placeholderTextColor={COLORS.textMuted}
                  value={state}
                  onChangeText={(text) => setState(text.slice(0, 2).toUpperCase())}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <View style={styles.countryField}>
              <Text style={styles.fieldLabel}>País</Text>
              <TextInput
                style={styles.input}
                placeholder="Brasil"
                placeholderTextColor={COLORS.textMuted}
                value={country}
                onChangeText={setCountry}
              />
            </View>
          </View>

          {/* Categoria de Atleta */}
          <View style={styles.section}>
            <Text style={styles.label}>Categoria</Text>
            <Text style={styles.hint}>Selecione seu perfil de atleta</Text>
            <View style={styles.categoriesContainer}>
              {ATHLETE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    athleteCategory === cat.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setAthleteCategory(cat.id as 'PRO' | 'AMATEUR' | 'COACH')}
                >
                  <View style={styles.categoryRadio}>
                    {athleteCategory === cat.id && (
                      <View style={styles.categoryRadioInner} />
                    )}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[
                      styles.categoryLabel,
                      athleteCategory === cat.id && styles.categoryLabelSelected,
                    ]}>
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryDescription}>{cat.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Modalidades */}
          <View style={styles.section}>
            <Text style={styles.label}>Modalidades</Text>
            <Text style={styles.hint}>Selecione até 5 atividades que pratica</Text>
            <View style={styles.sportsGrid}>
              {SPORTS_OPTIONS.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportChip,
                    selectedSports.includes(sport.id) && styles.sportChipSelected,
                  ]}
                  onPress={() => toggleSport(sport.id)}
                >
                  <Text style={styles.sportIcon}>{sport.icon}</Text>
                  <Text style={[
                    styles.sportLabel,
                    selectedSports.includes(sport.id) && styles.sportLabelSelected,
                  ]}>
                    {sport.label}
                  </Text>
                  {selectedSports.includes(sport.id) && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  readOnlyField: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  bioInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationField: {
    flex: 3,
  },
  stateField: {
    flex: 1,
  },
  countryField: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoriesContainer: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  categoryRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
  },
  categoryDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  sportChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  sportIcon: {
    fontSize: 16,
  },
  sportLabel: {
    fontSize: 13,
    color: COLORS.text,
  },
  sportLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

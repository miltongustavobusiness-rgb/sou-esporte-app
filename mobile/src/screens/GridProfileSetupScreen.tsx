import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { RootStackParamList } from '../types';

type GridProfileSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GridProfileSetup'>;
  route: RouteProp<RootStackParamList, 'GridProfileSetup'>;
};

// Sports options
const SPORTS_OPTIONS = [
  { id: 'corrida', label: 'Corrida', icon: '🏃' },
  { id: 'ciclismo', label: 'Ciclismo', icon: '🚴' },
  { id: 'natacao', label: 'Natação', icon: '🏊' },
  { id: 'triathlon', label: 'Triathlon', icon: '🏅' },
  { id: 'musculacao', label: 'Musculação', icon: '💪' },
  { id: 'crossfit', label: 'CrossFit', icon: '🏋️' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'futebol', label: 'Futebol', icon: '⚽' },
  { id: 'basquete', label: 'Basquete', icon: '🏀' },
  { id: 'volei', label: 'Vôlei', icon: '🏐' },
  { id: 'tenis', label: 'Tênis', icon: '🎾' },
  { id: 'artes_marciais', label: 'Artes Marciais', icon: '🥋' },
  { id: 'surf', label: 'Surf', icon: '🏄' },
  { id: 'skate', label: 'Skate', icon: '🛹' },
  { id: 'escalada', label: 'Escalada', icon: '🧗' },
  { id: 'outro', label: 'Outro', icon: '🎯' },
];

export default function GridProfileSetupScreen({ navigation, route }: GridProfileSetupScreenProps) {
  const { user, updateUser } = useApp();
  const { showToast } = useToast();
  
  const userId = route?.params?.userId || user?.id;
  
  const [gridBio, setGridBio] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const MAX_BIO_LENGTH = 150;
  
  // Toggle sport selection
  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        return prev.filter(id => id !== sportId);
      } else {
        if (prev.length >= 5) {
          showToast('Máximo de 5 esportes', 'warning');
          return prev;
        }
        return [...prev, sportId];
      }
    });
  };
  
  // Handle continue
  const handleContinue = async () => {
    if (!gridBio.trim()) {
      showToast('Adicione uma bio para seu perfil', 'warning');
      return;
    }
    
    if (selectedSports.length === 0) {
      showToast('Selecione pelo menos um esporte', 'warning');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Save grid profile data
      const result = await api.updateGridProfile({
        userId: userId!,
        gridBio: gridBio.trim(),
        sports: selectedSports,
      });
      
      if (result.success) {
        // Update local user context
        if (user) {
          updateUser({
            ...user,
            gridBio: gridBio.trim(),
          });
        }
        
        showToast('Perfil configurado com sucesso!', 'success');
        
        // Navigate to suggest friends
        navigation.replace('SuggestFriends', { userId: userId! });
      } else {
        showToast('Erro ao salvar perfil. Tente novamente.', 'error');
      }
    } catch (error: any) {
      console.error('Error saving grid profile:', error);
      showToast(error.message || 'Erro ao salvar perfil', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Skip to feed
  const handleSkip = () => {
    navigation.replace('Feed');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Configure seu Perfil</Text>
            <Text style={styles.subtitle}>
              Personalize seu perfil para que outros atletas possam te encontrar
            </Text>
          </View>
          
          {/* Profile Preview */}
          <View style={styles.profilePreview}>
            <View style={styles.avatarContainer}>
              {user?.photoUrl ? (
                <Image 
                  source={{ uri: user.photoUrl }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || 'Atleta'}</Text>
            {user?.city && (
              <Text style={styles.userCity}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                {' '}{user.city}
              </Text>
            )}
          </View>
          
          {/* Bio Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio do Perfil</Text>
            <Text style={styles.sectionSubtitle}>
              Uma breve descrição que aparecerá no seu grid
            </Text>
            <View style={styles.bioInputContainer}>
              <TextInput
                style={styles.bioInput}
                placeholder="Ex: Corredor amador, apaixonado por maratonas 🏃‍♂️"
                placeholderTextColor={COLORS.textSecondary}
                value={gridBio}
                onChangeText={(text) => setGridBio(text.slice(0, MAX_BIO_LENGTH))}
                multiline
                maxLength={MAX_BIO_LENGTH}
              />
              <Text style={styles.charCount}>
                {gridBio.length}/{MAX_BIO_LENGTH}
              </Text>
            </View>
          </View>
          
          {/* Sports Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Esportes que pratica</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione até 5 esportes (mínimo 1)
            </Text>
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
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Pular por agora</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  profilePreview: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
  },
  avatarContainer: {
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  userName: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userCity: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  bioInputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bioInput: {
    fontSize: SIZES.md,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  sportChipSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  sportIcon: {
    fontSize: 16,
  },
  sportLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  sportLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttonsContainer: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.background,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  skipButtonText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
});

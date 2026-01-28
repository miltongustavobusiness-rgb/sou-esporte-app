import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

import { useToast } from '../contexts/ToastContext';
type CreateTeamScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateTeam'>;
};

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CreateTeamScreen({ navigation }: CreateTeamScreenProps) {
  const { showToast } = useToast();
  const { refreshTeams } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    state: '',
    email: '',
    phone: '',
    website: '',
    isPublic: true,
    allowJoinRequests: true,
    primaryColor: '#4CAF50',
  });
  const [showStatePicker, setShowStatePicker] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('O nome da equipe é obrigatório.', 'info');
      return false;
    }
    if (formData.name.length < 3) {
      showToast('O nome da equipe deve ter pelo menos 3 caracteres.', 'info');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Gerar slug a partir do nome
      const slug = formData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const team = await api.createTeam({
        name: formData.name.trim(),
        slug,
        description: formData.description.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        isPublic: formData.isPublic,
        allowJoinRequests: formData.allowJoinRequests,
        primaryColor: formData.primaryColor,
      });

      await refreshTeams();
      showToast('Equipe criada com sucesso!', 'success');
      setTimeout(() => navigation.navigate('TeamDetail', { teamId: team.id }), 1500);
    } catch (error: any) {
      showToast(error.message || 'Não foi possível criar a equipe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Equipe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Equipe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Runners SP"
              placeholderTextColor={COLORS.textMuted}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva sua equipe..."
              placeholderTextColor={COLORS.textMuted}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localização</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: São Paulo"
                placeholderTextColor={COLORS.textMuted}
                value={formData.city}
                onChangeText={(text) => handleChange('city', text)}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: SPACING.sm }]}>
              <Text style={styles.label}>Estado</Text>
              <TouchableOpacity 
                style={styles.selectInput}
                onPress={() => setShowStatePicker(!showStatePicker)}
              >
                <Text style={formData.state ? styles.selectText : styles.selectPlaceholder}>
                  {formData.state || 'UF'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {showStatePicker && (
            <View style={styles.statePicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.stateGrid}>
                  {STATES.map(state => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.stateOption,
                        formData.state === state && styles.stateOptionSelected
                      ]}
                      onPress={() => {
                        handleChange('state', state);
                        setShowStatePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.stateOptionText,
                        formData.state === state && styles.stateOptionTextSelected
                      ]}>
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="equipe@exemplo.com"
              placeholderTextColor={COLORS.textMuted}
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              placeholder="(11) 99999-9999"
              placeholderTextColor={COLORS.textMuted}
              value={formData.phone}
              onChangeText={(text) => handleChange('phone', text)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.suaequipe.com.br"
              placeholderTextColor={COLORS.textMuted}
              value={formData.website}
              onChangeText={(text) => handleChange('website', text)}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Equipe Pública</Text>
              <Text style={styles.switchDescription}>
                Permite que outros atletas encontrem sua equipe
              </Text>
            </View>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => handleChange('isPublic', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={formData.isPublic ? COLORS.primary : COLORS.textSecondary}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Permitir Solicitações</Text>
              <Text style={styles.switchDescription}>
                Atletas podem solicitar entrada na equipe
              </Text>
            </View>
            <Switch
              value={formData.allowJoinRequests}
              onValueChange={(value) => handleChange('allowJoinRequests', value)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={formData.allowJoinRequests ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.submitButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Criar Equipe</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...FONTS.body4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...FONTS.body3,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  selectInput: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...FONTS.body3,
    color: COLORS.text,
  },
  selectPlaceholder: {
    ...FONTS.body3,
    color: COLORS.textMuted,
  },
  statePicker: {
    marginTop: SPACING.sm,
  },
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  stateOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stateOptionText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  stateOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  switchLabel: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '500',
  },
  switchDescription: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
});

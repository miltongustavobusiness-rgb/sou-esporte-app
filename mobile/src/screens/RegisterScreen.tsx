import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

type GenderOption = 'male' | 'female' | 'other' | 'prefiro_nao_informar' | '';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino', icon: 'male' },
  { value: 'female', label: 'Feminino', icon: 'female' },
  { value: 'other', label: 'Outro', icon: 'person' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar', icon: 'help-circle' },
];

const MIN_AGE = 16;

/**
 * RegisterScreen - Tela de Cadastro Simplificado
 * 
 * CONFORMIDADE APPLE/GOOGLE:
 * - NÃO solicita CPF
 * - NÃO solicita endereço
 * - NÃO solicita dados fiscais
 * - Apenas dados básicos: foto, nome, email, data nascimento, sexo
 */
export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { showToast } = useToast();
  
  // Dados básicos (permitidos)
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderOption>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Precisamos de acesso à galeria para selecionar sua foto.', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Precisamos de acesso à câmera para tirar sua foto.', 'warning');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Foto de Perfil',
      'Como você quer adicionar sua foto?',
      [
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateFullName = (name: string): boolean => {
    const words = name.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length >= 2);
  };

  const validateBirthDate = (date: string): { valid: boolean; message?: string } => {
    const parts = date.split('/');
    if (parts.length !== 3) return { valid: false, message: 'Data inválida' };
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { valid: false, message: 'Data inválida' };
    }
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      return { valid: false, message: 'Data inválida' };
    }
    
    const birthDateObj = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    if (age < MIN_AGE) {
      return { valid: false, message: `Você precisa ter pelo menos ${MIN_AGE} anos` };
    }
    
    return { valid: true };
  };

  const handleRegister = async () => {
    // Validações - SEM CPF (conformidade Apple/Google)
    if (!profileImage) {
      showToast('Por favor, adicione uma foto de perfil.', 'warning');
      return;
    }

    if (!validateFullName(name)) {
      showToast('Por favor, insira seu nome completo (nome e sobrenome).', 'warning');
      return;
    }

    if (!validateEmail(email)) {
      showToast('Por favor, insira um e-mail válido.', 'warning');
      return;
    }

    const birthValidation = validateBirthDate(birthDate);
    if (!birthValidation.valid) {
      showToast(birthValidation.message || 'Data de nascimento inválida.', 'warning');
      return;
    }

    if (!gender) {
      showToast('Por favor, selecione seu sexo.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.', 'warning');
      return;
    }

    if (!acceptTerms) {
      showToast('Você precisa aceitar os termos de uso para continuar.', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      // Parse birth date
      const [day, month, year] = birthDate.split('/');
      const birthDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Upload profile image
      let photoUrl: string | undefined;
      if (profileImage) {
        try {
          const response = await fetch(profileImage);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          });
          const base64 = await base64Promise;
          const uploadResult = await api.uploadImage(base64, 'profile.jpg', 'image/jpeg', 'profiles');
          if (uploadResult.success) {
            photoUrl = uploadResult.url;
          }
        } catch (uploadError) {
          console.error('Error uploading profile image:', uploadError);
        }
      }

      // Register user - SEM CPF
      const result = await api.registerUser({
        name,
        email,
        password,
        phone: phone.replace(/\D/g, '') || undefined,
        birthDate: birthDateObj,
        gender: gender as 'male' | 'female' | 'other',
        photoUrl,
        // profile_status será BASIC_COMPLETE após registro
        // billing_status será INCOMPLETE (CPF/endereço serão coletados no checkout web)
      });
      
      if (result.success) {
        showToast('Conta criada com sucesso! Faça login para continuar.', 'success');
        setTimeout(() => {
          navigation.replace('Login');
        }, 1500);
      } else {
        showToast(result.message || 'Não foi possível realizar o cadastro.', 'error');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showToast(error?.message || 'Não foi possível realizar o cadastro. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <LinearGradient
        colors={[COLORS.background, '#1a2744']}
        style={styles.backgroundGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Criar Conta</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Image */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity style={styles.profileImageContainer} onPress={showImageOptions}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={50} color={COLORS.textMuted} />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={18} color={COLORS.background} />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileImageText}>Foto de perfil *</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Nome Completo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome completo *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome e sobrenome"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* E-mail */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Celular (opcional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Celular</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={COLORS.textMuted}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhone(text))}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Data de Nascimento */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data de nascimento *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={COLORS.textMuted}
                  value={birthDate}
                  onChangeText={(text) => setBirthDate(formatBirthDate(text))}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <Text style={styles.inputHint}>Idade mínima: {MIN_AGE} anos</Text>
            </View>

            {/* Sexo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sexo *</Text>
              <TouchableOpacity
                style={styles.selectContainer}
                onPress={() => setShowGenderModal(true)}
              >
                <Ionicons
                  name={gender ? (GENDER_OPTIONS.find(g => g.value === gender)?.icon as any) : 'person-outline'}
                  size={20}
                  color={gender ? COLORS.text : COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <Text style={[styles.selectText, !gender && styles.selectPlaceholder]}>
                  {gender ? GENDER_OPTIONS.find(g => g.value === gender)?.label : 'Selecione'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Senha */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmar Senha */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar senha *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repita a senha"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Termos */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Ionicons name="checkmark" size={16} color={COLORS.background} />}
              </View>
              <Text style={styles.termsText}>
                Li e aceito os{' '}
                <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
                <Text style={styles.termsLink}>Política de Privacidade</Text>
              </Text>
            </TouchableOpacity>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Seus dados estão seguros. Não compartilhamos suas informações com terceiros.
              </Text>
            </View>

            {/* Botão Cadastrar */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.registerButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.registerButtonText}>Criar Conta</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Seleção de Sexo */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione seu sexo</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  gender === option.value && styles.genderOptionSelected,
                ]}
                onPress={() => {
                  setGender(option.value as GenderOption);
                  setShowGenderModal(false);
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={gender === option.value ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === option.value && styles.genderOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {gender === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  profileImageText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  formContainer: {
    paddingHorizontal: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...FONTS.body4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 50,
    color: COLORS.text,
    ...FONTS.body3,
  },
  inputHint: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  selectText: {
    flex: 1,
    ...FONTS.body3,
    color: COLORS.text,
  },
  selectPlaceholder: {
    color: COLORS.textMuted,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    ...FONTS.body5,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    ...FONTS.body5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  registerButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  registerButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    ...FONTS.h4,
    color: COLORS.background,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  loginLink: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  genderOptionText: {
    flex: 1,
    ...FONTS.body3,
    color: COLORS.text,
  },
  genderOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

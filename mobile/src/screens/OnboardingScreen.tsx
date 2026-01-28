import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import * as ImagePicker from 'expo-image-picker';
import { completeOnboarding } from '../config/api';
import { api } from '../services/api';
// SDK 54 FIX: Usar expo-file-system/legacy para compatibilidade
let FileSystem: any;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  FileSystem = require('expo-file-system');
}

import { RouteProp } from '@react-navigation/native';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
  route: RouteProp<RootStackParamList, 'Onboarding'>;
};

type GenderOption = 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar' | '';

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino', icon: 'male' },
  { value: 'feminino', label: 'Feminino', icon: 'female' },
  { value: 'outro', label: 'Outro', icon: 'person' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar', icon: 'help-circle' },
];

const MIN_AGE = 16; // Idade mínima configurável

export default function OnboardingScreen({ navigation, route }: OnboardingScreenProps) {
  const { user, updateUser } = useApp();
  const { showToast } = useToast();
  
  // Pegar email, phone e userId dos parâmetros da rota (vindos do login OTP)
  const routeEmail = route?.params?.email || '';
  const routePhone = route?.params?.phone || '';
  const routeUserId = route?.params?.userId || user?.id;
  
  // Estados do formulário - priorizar dados da rota, depois do usuário
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderOption>('');
  const [phone, setPhone] = useState(routePhone || user?.phone || '');
  const [email, setEmail] = useState(routeEmail || user?.email || '');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Animação
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Atualizar progresso animado
  const updateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: step,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Selecionar foto de perfil
  const handleSelectPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      showToast('Permissão para acessar galeria é necessária.', 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  // Tirar foto
  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      showToast('Permissão para acessar câmera é necessária.', 'warning');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  // Formatar data de nascimento
  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  // Validar data de nascimento e idade
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

  // Validar nome completo (mínimo 2 palavras)
  const validateFullName = (name: string): boolean => {
    const words = name.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length >= 2);
  };

  // Formatar username (apenas letras minúsculas, números e _)
  const formatUsername = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 30);
  };

  // Verificar disponibilidade do username
  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setUsernameChecking(true);
    try {
      const result = await api.checkUsernameAvailable(usernameToCheck);
      setUsernameAvailable(result.available);
    } catch (error) {
      console.error('Erro ao verificar username:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // Sugerir username baseado no nome
  const suggestUsernameFromName = async (name: string) => {
    if (!name || name.length < 3) return;
    
    try {
      const result = await api.suggestUsername(name);
      if (result.suggestion && !username) {
        setUsername(result.suggestion);
        checkUsernameAvailability(result.suggestion);
      }
    } catch (error) {
      console.error('Erro ao sugerir username:', error);
    }
  };

  // Quando o nome mudar, sugerir username
  useEffect(() => {
    if (fullName && validateFullName(fullName) && !username) {
      suggestUsernameFromName(fullName);
    }
  }, [fullName]);

  // Debounce para verificar username
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        checkUsernameAvailability(username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Formatar telefone
  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  // Avançar para próximo passo
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!profilePhoto) {
        showToast('Por favor, adicione uma foto de perfil.', 'warning');
        return;
      }
      setCurrentStep(2);
      updateProgress(2);
    } else if (currentStep === 2) {
      if (!validateFullName(fullName)) {
        showToast('Por favor, insira seu nome completo (nome e sobrenome).', 'warning');
        return;
      }
      
      if (!username || username.length < 3) {
        showToast('Por favor, escolha um nome de usuário (mínimo 3 caracteres).', 'warning');
        return;
      }
      
      if (usernameAvailable === false) {
        showToast('Este nome de usuário já está em uso. Escolha outro.', 'warning');
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
      
      setCurrentStep(3);
      updateProgress(3);
    }
  };

  // Voltar para passo anterior
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      updateProgress(currentStep - 1);
    }
  };

  // Finalizar cadastro
  const handleComplete = async () => {
    // Validações finais
    if (!profilePhoto) {
      showToast('Foto de perfil é obrigatória.', 'warning');
      return;
    }
    
    if (!validateFullName(fullName)) {
      showToast('Nome completo é obrigatório.', 'warning');
      return;
    }
    
    if (!username || username.length < 3) {
      showToast('Nome de usuário é obrigatório (mínimo 3 caracteres).', 'warning');
      return;
    }
    
    if (usernameAvailable === false) {
      showToast('Este nome de usuário já está em uso.', 'warning');
      return;
    }
    
    const birthValidation = validateBirthDate(birthDate);
    if (!birthValidation.valid) {
      showToast(birthValidation.message || 'Data de nascimento inválida.', 'warning');
      return;
    }
    
    if (!gender) {
      showToast('Sexo é obrigatório.', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      // Verificar se temos userId
      if (!routeUserId) {
        showToast('Erro: Usuário não identificado. Faça login novamente.', 'error');
        navigation.replace('Login');
        return;
      }
      
      // Upload da foto para S3 se houver
      let uploadedPhotoUrl = profilePhoto;
      if (profilePhoto && (profilePhoto.startsWith('file://') || profilePhoto.startsWith('ph://'))) {
        try {
          showToast('Enviando foto de perfil...', 'info');
          const base64 = await FileSystem.readAsStringAsync(profilePhoto, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const filename = `profile-${routeUserId}-${Date.now()}.jpg`;
          const uploadResult = await api.uploadImage(base64, filename, 'image/jpeg', 'profiles');
          if (uploadResult.success && uploadResult.url) {
            uploadedPhotoUrl = uploadResult.url;
            console.log('Photo uploaded successfully:', uploadedPhotoUrl);
          } else {
            console.warn('Photo upload failed:', uploadResult);
            showToast('Erro ao enviar foto. Tente novamente.', 'error');
            setIsLoading(false);
            return; // Don't continue without valid photo URL
          }
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          showToast('Erro ao enviar foto. Tente novamente.', 'error');
          setIsLoading(false);
          return; // Don't continue without valid photo URL
        }
      }
      
      // Chamar API para salvar dados do onboarding
      const result = await completeOnboarding({
        userId: routeUserId,
        name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        birthDate: birthDate, // DD/MM/YYYY
        gender: gender as 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar',
        photoUrl: uploadedPhotoUrl || undefined,
      });
      
      if (result.success && result.user) {
        // Atualizar usuário no contexto local
        updateUser(result.user);
        
        showToast('Cadastro concluído com sucesso!', 'success');
        // Navigate to Grid Profile Setup instead of Feed
        navigation.replace('GridProfileSetup', { userId: routeUserId });
      } else {
        showToast('Erro ao salvar dados. Tente novamente.', 'error');
      }
    } catch (error: any) {
      console.error('Erro ao completar onboarding:', error);
      showToast(error.message || 'Erro ao salvar dados. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar Step 1 - Foto de Perfil
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Sua foto de perfil</Text>
        <Text style={styles.stepSubtitle}>
          Adicione uma foto para que outros atletas possam te reconhecer
        </Text>
      </View>

      <TouchableOpacity
        style={styles.photoContainer}
        onPress={handleSelectPhoto}
        activeOpacity={0.8}
      >
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={60} color={COLORS.textMuted} />
          </View>
        )}
        <View style={styles.photoEditBadge}>
          <Ionicons name="camera" size={20} color={COLORS.background} />
        </View>
      </TouchableOpacity>

      <View style={styles.photoButtonsContainer}>
        <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhoto}>
          <Ionicons name="images-outline" size={20} color={COLORS.primary} />
          <Text style={styles.photoButtonText}>Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
          <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.infoText}>
          A foto de perfil é obrigatória e ajuda a criar uma comunidade mais segura e confiável.
        </Text>
      </View>
    </View>
  );

  // Renderizar Step 2 - Dados Pessoais
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Seus dados</Text>
        <Text style={styles.stepSubtitle}>
          Informações básicas para completar seu perfil
        </Text>
      </View>

      {/* Nome Completo */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome completo *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Seu nome e sobrenome"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>
        <Text style={styles.inputHint}>Mínimo de 2 palavras</Text>
      </View>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome de usuário *</Text>
        <View style={[
          styles.inputContainer,
          usernameAvailable === true && styles.inputContainerSuccess,
          usernameAvailable === false && styles.inputContainerError,
        ]}>
          <Text style={styles.inputIcon}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="seu_username"
            placeholderTextColor={COLORS.textMuted}
            value={username}
            onChangeText={(text) => setUsername(formatUsername(text))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameChecking && (
            <ActivityIndicator size="small" color={COLORS.primary} />
          )}
          {!usernameChecking && usernameAvailable === true && (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          )}
          {!usernameChecking && usernameAvailable === false && (
            <Ionicons name="close-circle" size={20} color="#F44336" />
          )}
        </View>
        <Text style={[
          styles.inputHint,
          usernameAvailable === true && { color: '#4CAF50' },
          usernameAvailable === false && { color: '#F44336' },
        ]}>
          {usernameAvailable === true ? 'Disponível!' : 
           usernameAvailable === false ? 'Já está em uso' : 
           'Letras minúsculas, números e _ (mín. 3 caracteres)'}
        </Text>
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
    </View>
  );

  // Renderizar Step 3 - Contato
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Contato</Text>
        <Text style={styles.stepSubtitle}>
          Confirme suas informações de contato
        </Text>
      </View>

      {/* Celular */}
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

      {/* E-mail */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>E-mail</Text>
        <View style={[styles.inputContainer, routeEmail ? styles.inputContainerDisabled : null]}>
          <Ionicons name="mail-outline" size={20} color={routeEmail ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, routeEmail ? styles.inputDisabled : null]}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!routeEmail}
          />
          {routeEmail && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              <Text style={styles.verifiedText}>Verificado</Text>
            </View>
          )}
        </View>
        {routeEmail && (
          <Text style={styles.inputHint}>
            Este e-mail foi verificado e não pode ser alterado.
          </Text>
        )}
      </View>

      {/* Resumo */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Resumo do cadastro</Text>
        <View style={styles.summaryRow}>
          {profilePhoto && (
            <Image source={{ uri: profilePhoto }} style={styles.summaryPhoto} />
          )}
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryName}>{fullName}</Text>
            <Text style={styles.summaryDetail}>
              {GENDER_OPTIONS.find(g => g.value === gender)?.label} • {birthDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Termos */}
      <View style={styles.termsContainer}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
        <Text style={styles.termsText}>
          Ao continuar, você concorda com nossos{' '}
          <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
          <Text style={styles.termsLink}>Política de Privacidade</Text>
        </Text>
      </View>
    </View>
  );

  // Renderizar conteúdo do step atual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo-souesporte.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header com Progresso */}
        <View style={styles.header}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          )}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [1, totalSteps],
                      outputRange: ['33%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Passo {currentStep} de {totalSteps}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Botões de Navegação */}
        <View style={styles.footer}>
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNextStep}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleComplete}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Concluir Cadastro</Text>
                    <Ionicons name="checkmark" size={20} color={COLORS.background} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
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
  logoContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: SPACING.sm,
  },
  logo: {
    width: 200,
    height: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  // Photo Step
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: SIZES.radius,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    ...FONTS.body5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Form Inputs
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...FONTS.body4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
  inputContainerSuccess: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#F44336',
    borderWidth: 2,
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
  // Summary
  summaryContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  summaryDetail: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
  },
  // Terms
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    padding: SPACING.md,
    borderRadius: SIZES.radius,
  },
  termsText: {
    flex: 1,
    ...FONTS.body5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  primaryButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  primaryButtonText: {
    ...FONTS.h4,
    color: COLORS.background,
  },
  // Modal
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
  // Email verificado
  inputContainerDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderColor: COLORS.primary,
  },
  inputDisabled: {
    color: COLORS.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radius,
    gap: 4,
  },
  verifiedText: {
    ...FONTS.body5,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

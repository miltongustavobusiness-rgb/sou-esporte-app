import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
// SDK 54 FIX: Usar expo-file-system/legacy para compatibilidade
let FileSystem: any;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  FileSystem = require('expo-file-system');
}

import { useToast } from '../contexts/ToastContext';
type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { showToast } = useToast();
  const { user, refreshUser, updateUser } = useApp();
  
  // Estados dos campos
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [shirtSize, setShirtSize] = useState('M');
  const [healthInfo, setHealthInfo] = useState('');
  
  // Endereço
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  // Foto
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  
  // Estados de controle
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  // Carregar dados do perfil ao montar - usar dados do contexto como fonte principal
  // O contexto já contém todos os dados do usuário carregados no login
  useEffect(() => {
    loadProfileFromContext();
  }, [user]);

  const loadProfileFromContext = () => {
    setIsLoadingProfile(true);
    try {
      // Usar dados do contexto (carregados no login) como fonte principal
      // Isso funciona porque o login mobile retorna todos os dados do usuário
      if (user) {
        console.log('Loading profile from context:', user);
        setName(user.name || '');
        setEmail(user.email || '');
        setCpf(user.cpf || '');
        setPhone(user.phone || '');
        setBirthDate(user.birthDate ? formatDateFromISO(user.birthDate) : '');
        setGender(mapGenderFromAPI(user.gender));
        setStreet(user.street || '');
        setNumber(user.number || '');
        setComplement(user.complement || '');
        setNeighborhood(user.neighborhood || '');
        setCity(user.city || '');
        setState(user.state || '');
        setZipCode(user.zipCode || '');
        setEmergencyName(user.emergencyName || '');
        setEmergencyContact(user.emergencyPhone || '');
        setBloodType(user.bloodType || '');
        setHealthInfo(user.healthInfo || '');
        setAvatar(user.avatar || null);
      }
    } catch (error) {
      console.error('Error loading profile from context:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const formatDateFromISO = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const mapGenderFromAPI = (apiGender: string | null | undefined): string => {
    switch (apiGender) {
      case 'male': return 'Masculino';
      case 'female': return 'Feminino';
      case 'other': return 'Outro';
      default: return '';
    }
  };

  const mapGenderToAPI = (displayGender: string): 'male' | 'female' | 'other' | undefined => {
    switch (displayGender) {
      case 'Masculino': return 'male';
      case 'Feminino': return 'female';
      case 'Outro': return 'other';
      default: return undefined;
    }
  };

  const formatCPF = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (match) {
      return [match[1], match[2], match[3], match[4]]
        .filter(Boolean)
        .join('.')
        .replace(/\.(\d{2})$/, '-$1');
    }
    return text;
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (match) {
      let result = '';
      if (match[1]) result = `(${match[1]}`;
      if (match[2]) result += `) ${match[2]}`;
      if (match[3]) result += `-${match[3]}`;
      return result;
    }
    return text;
  };

  const formatDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,2})(\d{0,2})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('/');
    }
    return text;
  };

  const formatZipCode = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,5})(\d{0,3})$/);
    if (match) {
      return [match[1], match[2]].filter(Boolean).join('-');
    }
    return text;
  };

  const parseDateToISO = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? undefined : date;
  };

  const pickImageFromGallery = async () => {
    setShowPhotoOptions(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Precisamos de acesso à sua galeria para alterar a foto.', 'info');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowPhotoOptions(false);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Precisamos de acesso à câmera para tirar uma foto.', 'info');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewAvatarUri(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    setShowPhotoOptions(false);
    // Remover foto diretamente
    setAvatar(null);
    setNewAvatarUri(null);
    showToast('Foto de perfil removida.', 'info');
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);
      
      // Ler arquivo como base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determinar tipo de arquivo
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `profile_${Date.now()}.${extension}`;
      
      // Upload para o servidor
      const result = await api.uploadImage(base64, filename, contentType, 'profiles');
      
      if (result.success && result.url) {
        return result.url;
      } else {
        throw new Error('Upload falhou');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Não foi possível fazer upload da foto. Tente novamente.', 'info');
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('O nome é obrigatório.', 'info');
      return;
    }

    setIsLoading(true);
    
    try {
      let photoUrl = avatar;
      
      // Se há uma nova foto selecionada, fazer upload
      if (newAvatarUri) {
        const uploadedUrl = await uploadPhoto(newAvatarUri);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }
      
      // Verificar se o usuário está logado
      if (!user?.id) {
        showToast('Você precisa estar logado para editar o perfil.', 'info');
        return;
      }

      // Preparar dados para envio (incluindo userId para o endpoint mobile)
      const profileData: any = {
        userId: user.id,
        name: name.trim(),
        cpf: cpf.replace(/\D/g, '') || undefined,
        phone: phone.replace(/\D/g, '') || undefined,
        birthDate: parseDateToISO(birthDate),
        gender: mapGenderToAPI(gender),
        photoUrl: photoUrl || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.replace(/\D/g, '') || undefined,
        emergencyName: emergencyName.trim() || undefined,
        emergencyPhone: emergencyContact.replace(/\D/g, '') || undefined,
        bloodType: bloodType || undefined,
        healthInfo: healthInfo.trim() || undefined,
      };
      
      // Remover campos undefined
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });
      
      // Salvar no backend
      const result = await api.updateProfile(profileData);
      
      if (result.success) {
        // Atualizar contexto local com todos os dados do usuário retornados pelo backend
        if (result.user) {
          updateUser({
            name: result.user.name || name.trim(),
            avatar: result.user.photoUrl || photoUrl,
            cpf: result.user.cpf || cpf,
            phone: result.user.phone || phone,
            birthDate: result.user.birthDate || birthDate,
            gender: result.user.gender || mapGenderToAPI(gender),
            city: result.user.city || city.trim(),
            state: result.user.state || state.trim(),
            street: result.user.street || street.trim(),
            number: result.user.number || number.trim(),
            complement: result.user.complement || complement.trim(),
            neighborhood: result.user.neighborhood || neighborhood.trim(),
            zipCode: result.user.zipCode || zipCode,
            emergencyName: result.user.emergencyName || emergencyName.trim(),
            emergencyPhone: result.user.emergencyPhone || emergencyContact,
            bloodType: result.user.bloodType || bloodType,
            healthInfo: result.user.healthInfo || healthInfo.trim(),
          });
        } else {
          // Fallback: atualizar com dados locais
          updateUser({
            name: name.trim(),
            avatar: photoUrl,
            cpf,
            phone,
            birthDate,
            gender: mapGenderToAPI(gender),
            city: city.trim(),
            state: state.trim(),
          });
        }
        
        // Atualizar avatar local se foi alterado
        if (photoUrl) {
          setAvatar(photoUrl);
          setNewAvatarUri(null);
        }
        
        showToast('Perfil atualizado com sucesso!', 'success');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Não foi possível salvar as alterações. Tente novamente.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const shirtSizes = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
  const genders = ['Masculino', 'Feminino', 'Outro'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const displayAvatar = newAvatarUri || avatar;

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => setShowPhotoOptions(true)}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color={COLORS.white} size="large" />
              </View>
            ) : displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPhotoOptions(true)}>
            <Text style={styles.changePhotoText}>
              {displayAvatar ? 'Alterar foto' : 'Adicionar foto'}
            </Text>
          </TouchableOpacity>
          {newAvatarUri && (
            <Text style={styles.photoChangedText}>Nova foto selecionada</Text>
          )}
        </View>

        {/* Dados Pessoais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={email}
                editable={false}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
              />
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
            </View>
            <Text style={styles.helperText}>O e-mail não pode ser alterado</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CPF</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={cpf}
                onChangeText={(text) => setCpf(formatCPF(text))}
                placeholder="000.000.000-00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={14}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => setPhone(formatPhone(text))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Nascimento</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={(text) => setBirthDate(formatDate(text))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gênero</Text>
            <View style={styles.optionsRow}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionButton, gender === g && styles.optionButtonSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={zipCode}
                onChangeText={(text) => setZipCode(formatZipCode(text))}
                placeholder="00000-000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rua</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="Nome da rua"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.sm }]}>
              <Text style={styles.label}>Número</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={number}
                  onChangeText={setNumber}
                  placeholder="Nº"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Complemento</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={complement}
                  onChangeText={setComplement}
                  placeholder="Apto, Bloco, etc."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bairro</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="Bairro"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: SPACING.sm }]}>
              <Text style={styles.label}>Cidade</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Cidade"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Estado</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.stateRow}>
                  {states.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.stateButton, state === s && styles.stateButtonSelected]}
                      onPress={() => setState(s)}
                    >
                      <Text style={[styles.stateText, state === s && styles.stateTextSelected]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Informações de Corrida */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Corrida</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tamanho de Camiseta</Text>
            <View style={styles.sizeRow}>
              {shirtSizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeButton, shirtSize === size && styles.sizeButtonSelected]}
                  onPress={() => setShirtSize(size)}
                >
                  <Text style={[styles.sizeText, shirtSize === size && styles.sizeTextSelected]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo Sanguíneo</Text>
            <View style={styles.bloodTypeRow}>
              {bloodTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.bloodTypeButton, bloodType === type && styles.bloodTypeButtonSelected]}
                  onPress={() => setBloodType(type)}
                >
                  <Text style={[styles.bloodTypeText, bloodType === type && styles.bloodTypeTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Informações de Saúde</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={healthInfo}
                onChangeText={setHealthInfo}
                placeholder="Alergias, medicamentos, condições médicas..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Contato de Emergência */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato de Emergência</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Contato</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Nome do contato"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone de Emergência</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={emergencyContact}
                onChangeText={(text) => setEmergencyContact(formatPhone(text))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, (isLoading || isUploadingPhoto) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading || isUploadingPhoto}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.saveButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Salvando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de opções de foto */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Foto de Perfil</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <View style={[styles.modalIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.modalOptionText}>Tirar foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImageFromGallery}>
              <View style={[styles.modalIconContainer, { backgroundColor: COLORS.info + '20' }]}>
                <Ionicons name="images" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.modalOptionText}>Escolher da galeria</Text>
            </TouchableOpacity>
            
            {displayAvatar && (
              <TouchableOpacity style={styles.modalOption} onPress={removePhoto}>
                <View style={[styles.modalIconContainer, { backgroundColor: COLORS.error + '20' }]}>
                  <Ionicons name="trash" size={24} color={COLORS.error} />
                </View>
                <Text style={[styles.modalOptionText, { color: COLORS.error }]}>Remover foto</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
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
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  cameraIcon: {
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
  changePhotoText: {
    marginTop: SPACING.sm,
    fontSize: SIZES.body4,
    color: COLORS.primary,
    fontWeight: '600',
  },
  photoChangedText: {
    marginTop: SPACING.xs,
    fontSize: SIZES.body5,
    color: COLORS.success,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.body1,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  helperText: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: SIZES.body3,
    color: COLORS.text,
  },
  inputTextDisabled: {
    color: COLORS.textMuted,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.backgroundLight,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  stateRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  stateButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius / 2,
    backgroundColor: COLORS.backgroundLight,
  },
  stateButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  stateText: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
  },
  stateTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sizeButton: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  sizeText: {
    fontSize: SIZES.body3,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sizeTextSelected: {
    color: COLORS.white,
  },
  bloodTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  bloodTypeButton: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodTypeButtonSelected: {
    backgroundColor: COLORS.error,
  },
  bloodTypeText: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  bloodTypeTextSelected: {
    color: COLORS.white,
  },
  saveButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginTop: SPACING.md,
    ...SHADOWS.medium,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body1,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: SIZES.body2,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalCancelButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: SIZES.body2,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});

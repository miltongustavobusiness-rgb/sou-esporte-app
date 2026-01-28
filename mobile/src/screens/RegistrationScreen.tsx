import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api, Event, EventCategory, EventKit } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

import { useToast } from '../contexts/ToastContext';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RegistrationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Registration'>;
  route: RouteProp<RootStackParamList, 'Registration'>;
};

type RegistrationType = 'individual' | 'team';

// Image crop/zoom modal component
const ImageCropModal = ({ 
  visible, 
  imageUri, 
  onClose, 
  onConfirm,
  aspectRatio = 1,
  title = 'Ajustar Foto'
}: {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: (uri: string) => void;
  aspectRatio?: number;
  title?: string;
}) => {
  const [scale, setScale] = useState(1);
  
  const handleZoomIn = () => setScale(Math.min(scale + 0.2, 3));
  const handleZoomOut = () => setScale(Math.max(scale - 0.2, 0.5));
  
  const handleConfirm = () => {
    if (imageUri) {
      onConfirm(imageUri);
    }
    onClose();
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={cropStyles.overlay}>
        <View style={cropStyles.container}>
          <View style={cropStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={cropStyles.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={cropStyles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
          
          <View style={cropStyles.imageContainer}>
            <View style={[cropStyles.cropArea, { aspectRatio }]}>
              <Image
                source={{ uri: imageUri }}
                style={[cropStyles.image, { transform: [{ scale }] }]}
                resizeMode="cover"
              />
            </View>
          </View>
          
          <View style={cropStyles.controls}>
            <Text style={cropStyles.hint}>
              Tamanho recomendado: {aspectRatio === 1 ? '400x400px' : '800x600px'}
            </Text>
            <View style={cropStyles.zoomControls}>
              <TouchableOpacity style={cropStyles.zoomButton} onPress={handleZoomOut}>
                <Ionicons name="remove" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={cropStyles.zoomText}>{Math.round(scale * 100)}%</Text>
              <TouchableOpacity style={cropStyles.zoomButton} onPress={handleZoomIn}>
                <Ionicons name="add" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const cropStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cropArea: {
    width: SCREEN_WIDTH - 80,
    maxHeight: SCREEN_WIDTH - 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    width: 60,
    textAlign: 'center',
  },
});

export default function RegistrationScreen({ navigation, route }: RegistrationScreenProps) {
  const { showToast } = useToast();
  const { eventId, categoryId, kitId } = route.params;
  const { user } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationType, setRegistrationType] = useState<RegistrationType>('individual');
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedKit, setSelectedKit] = useState<EventKit | null>(null);
  
  // Image crop modal state
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [currentImageTarget, setCurrentImageTarget] = useState<string>('');
  const [currentAspectRatio, setCurrentAspectRatio] = useState(1);
  
  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  
  // Individual registration data
  const [athleteData, setAthleteData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cpf: '',
    phone: '',
    birthDate: '',
    gender: 'M',
    shirtSize: 'M',
    emergencyContact: '',
    emergencyPhone: '',
    photo: '',
  });

  // Team registration data
  const [teamName, setTeamName] = useState('');
  const [teamPhoto, setTeamPhoto] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([
    { id: '1', name: '', email: '', cpf: '', shirtSize: 'M', photo: '', selected: true },
  ]);

  useEffect(() => {
    loadEventData();
  }, []);

  const loadEventData = async () => {
    try {
      // Load event from API
      const eventData = await api.getEventById(Number(eventId));
      setEvent(eventData);
      
      // Load categories
      const categories = await api.getEventCategories(Number(eventId));
      const category = categories.find(c => String(c.id) === String(categoryId));
      setSelectedCategory(category || null);
      
      // Load kits
      if (kitId) {
        const kits = await api.getEventKits(Number(eventId));
        const kit = kits.find(k => String(k.id) === String(kitId));
        setSelectedKit(kit || null);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      showToast('Não foi possível carregar os dados do evento.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (target: string, aspectRatio: number = 1) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      showToast('Precisamos de permissão para acessar suas fotos.', 'info');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setTempImageUri(result.assets[0].uri);
      setCurrentImageTarget(target);
      setCurrentAspectRatio(aspectRatio);
      setCropModalVisible(true);
    }
  };

  const handleImageConfirm = (uri: string) => {
    if (currentImageTarget === 'athlete') {
      setAthleteData({ ...athleteData, photo: uri });
    } else if (currentImageTarget === 'team') {
      setTeamPhoto(uri);
    } else if (currentImageTarget.startsWith('member_')) {
      const memberId = currentImageTarget.replace('member_', '');
      setTeamMembers(teamMembers.map(m => 
        m.id === memberId ? { ...m, photo: uri } : m
      ));
    }
  };

  const getSubtotal = () => {
    let total = 0;
    if (selectedCategory) total += parseFloat(selectedCategory.price || '0');
    if (selectedKit) total += parseFloat(selectedKit.additionalPrice || '0');
    
    if (registrationType === 'team') {
      const selectedMembers = teamMembers.filter(m => m.selected && m.name);
      total = total * selectedMembers.length;
    }
    
    return total;
  };

  const getTotalPrice = () => {
    const subtotal = getSubtotal();
    return Math.max(0, subtotal - voucherDiscount);
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Digite um código de cupom');
      return;
    }
    
    setVoucherLoading(true);
    setVoucherError('');
    
    try {
      const result = await api.validateVoucher(voucherCode.trim().toUpperCase(), Number(eventId), getSubtotal());
      
      if (result.valid) {
        setVoucherDiscount(result.discountAmount || 0);
        setVoucherApplied(true);
        showToast(`Desconto de ${formatPrice(result.discountAmount || 0)} aplicado com sucesso!`, 'success');
      } else {
        setVoucherError(result.message || 'Cupom inválido');
        setVoucherDiscount(0);
        setVoucherApplied(false);
      }
    } catch (error: any) {
      setVoucherError(error.message || 'Erro ao validar cupom');
      setVoucherDiscount(0);
      setVoucherApplied(false);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherApplied(false);
    setVoucherError('');
  };

  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: Date.now().toString(), name: '', email: '', cpf: '', shirtSize: 'M', photo: '', selected: true },
    ]);
  };

  const removeTeamMember = (id: string) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter(m => m.id !== id));
    }
  };

  const updateTeamMember = (id: string, field: string, value: any) => {
    setTeamMembers(teamMembers.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const validateIndividual = () => {
    // Conformidade Apple/Google: CPF não é mais obrigatório no app
    // Será solicitado no checkout web se necessário
    if (!athleteData.name || !athleteData.email) {
      showToast('Por favor, preencha nome e e-mail.', 'info');
      return false;
    }
    return true;
  };

  const validateTeam = () => {
    if (!teamName) {
      showToast('Por favor, informe o nome da equipe.', 'info');
      return false;
    }
    // Conformidade Apple/Google: CPF não é mais obrigatório no app
    const validMembers = teamMembers.filter(m => m.selected && m.name && m.email);
    if (validMembers.length === 0) {
      showToast('Adicione pelo menos um atleta com nome e e-mail.', 'info');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (registrationType === 'individual' && !validateIndividual()) return;
    if (registrationType === 'team' && !validateTeam()) return;

    setSubmitting(true);
    
    try {
      // Create registration via API
      const registrationData = {
        eventId: Number(eventId),
        categoryId: Number(categoryId),
        kitId: kitId ? Number(kitId) : undefined,
        shirtSize: athleteData.shirtSize,
        emergencyContact: athleteData.emergencyContact,
        emergencyPhone: athleteData.emergencyPhone,
      };
      
      const result = await api.createRegistration(registrationData);
      
      const memberCount = registrationType === 'team' 
        ? teamMembers.filter(m => m.selected && m.name).length 
        : 1;
      
      showToast(`${memberCount} ${memberCount > 1 ? 'atletas inscritos' : 'atleta inscrito'} com sucesso! Total: ${formatPrice(getTotalPrice())}`, 'success');
      setTimeout(() => navigation.navigate('MyRegistrations'), 2000);
    } catch (error: any) {
      showToast(error.message || 'Ocorreu um erro ao processar sua inscrição. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shirtSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Image Crop Modal */}
      <ImageCropModal
        visible={cropModalVisible}
        imageUri={tempImageUri}
        onClose={() => setCropModalVisible(false)}
        onConfirm={handleImageConfirm}
        aspectRatio={currentAspectRatio}
        title={currentImageTarget === 'team' ? 'Foto da Equipe' : 'Foto do Atleta'}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscrição</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event?.name}</Text>
          <View style={styles.categoryInfoRow}>
            <Text style={styles.eventCategory}>
              {selectedCategory?.name} {selectedCategory?.distance ? `- ${selectedCategory.distance} km` : ''}
            </Text>
            {selectedCategory?.isPaid === false && (
              <View style={styles.freeCategoryBadge}>
                <Ionicons name="gift" size={12} color="#10b981" />
                <Text style={styles.freeCategoryBadgeText}>Gratuita</Text>
              </View>
            )}
          </View>
          {selectedKit && <Text style={styles.eventKit}>Kit: {selectedKit.name}</Text>}
        </View>

        {/* Registration Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Inscrição</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                registrationType === 'individual' && styles.typeOptionSelected,
              ]}
              onPress={() => setRegistrationType('individual')}
            >
              <Ionicons 
                name="person" 
                size={24} 
                color={registrationType === 'individual' ? COLORS.background : COLORS.textMuted} 
              />
              <Text style={[
                styles.typeOptionText,
                registrationType === 'individual' && styles.typeOptionTextSelected,
              ]}>
                Individual
              </Text>
              <Text style={[
                styles.typeOptionDesc,
                registrationType === 'individual' && styles.typeOptionDescSelected,
              ]}>
                Apenas eu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeOption,
                registrationType === 'team' && styles.typeOptionSelected,
              ]}
              onPress={() => setRegistrationType('team')}
            >
              <Ionicons 
                name="people" 
                size={24} 
                color={registrationType === 'team' ? COLORS.background : COLORS.textMuted} 
              />
              <Text style={[
                styles.typeOptionText,
                registrationType === 'team' && styles.typeOptionTextSelected,
              ]}>
                Equipe
              </Text>
              <Text style={[
                styles.typeOptionDesc,
                registrationType === 'team' && styles.typeOptionDescSelected,
              ]}>
                Múltiplos atletas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {registrationType === 'individual' ? (
          /* Individual Registration Form */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados do Atleta</Text>
            
            {/* Photo */}
            <TouchableOpacity 
              style={styles.photoUpload}
              onPress={() => pickImage('athlete', 1)}
            >
              {athleteData.photo ? (
                <Image source={{ uri: athleteData.photo }} style={styles.photoPreview} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                  <Text style={styles.photoUploadText}>Adicionar Foto</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                value={athleteData.name}
                onChangeText={(text) => setAthleteData({ ...athleteData, name: text })}
                placeholder="Seu nome completo"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail *</Text>
              <TextInput
                style={styles.input}
                value={athleteData.email}
                onChangeText={(text) => setAthleteData({ ...athleteData, email: text })}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CPF *</Text>
                <TextInput
                  style={styles.input}
                  value={athleteData.cpf}
                  onChangeText={(text) => setAthleteData({ ...athleteData, cpf: text })}
                  placeholder="000.000.000-00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Telefone *</Text>
                <TextInput
                  style={styles.input}
                  value={athleteData.phone}
                  onChangeText={(text) => setAthleteData({ ...athleteData, phone: text })}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tamanho da Camiseta</Text>
              <View style={styles.sizeSelector}>
                {shirtSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      athleteData.shirtSize === size && styles.sizeOptionSelected,
                    ]}
                    onPress={() => setAthleteData({ ...athleteData, shirtSize: size })}
                  >
                    <Text style={[
                      styles.sizeOptionText,
                      athleteData.shirtSize === size && styles.sizeOptionTextSelected,
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contato de Emergência</Text>
              <TextInput
                style={styles.input}
                value={athleteData.emergencyContact}
                onChangeText={(text) => setAthleteData({ ...athleteData, emergencyContact: text })}
                placeholder="Nome do contato"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefone de Emergência</Text>
              <TextInput
                style={styles.input}
                value={athleteData.emergencyPhone}
                onChangeText={(text) => setAthleteData({ ...athleteData, emergencyPhone: text })}
                placeholder="(00) 00000-0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        ) : (
          /* Team Registration Form */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados da Equipe</Text>
            
            {/* Team Photo */}
            <TouchableOpacity 
              style={styles.photoUpload}
              onPress={() => pickImage('team', 4/3)}
            >
              {teamPhoto ? (
                <Image source={{ uri: teamPhoto }} style={styles.photoPreview} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                  <Text style={styles.photoUploadText}>Foto da Equipe</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Equipe *</Text>
              <TextInput
                style={styles.input}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Nome da sua equipe"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <Text style={styles.membersTitle}>Membros da Equipe</Text>
            
            {teamMembers.map((member, index) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberNumber}>Atleta {index + 1}</Text>
                  {teamMembers.length > 1 && (
                    <TouchableOpacity onPress={() => removeTeamMember(member.id)}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TextInput
                  style={styles.input}
                  value={member.name}
                  onChangeText={(text) => updateTeamMember(member.id, 'name', text)}
                  placeholder="Nome completo"
                  placeholderTextColor={COLORS.textMuted}
                />
                
                <TextInput
                  style={[styles.input, { marginTop: SPACING.sm }]}
                  value={member.email}
                  onChangeText={(text) => updateTeamMember(member.id, 'email', text)}
                  placeholder="E-mail"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <TextInput
                  style={[styles.input, { marginTop: SPACING.sm }]}
                  value={member.cpf}
                  onChangeText={(text) => updateTeamMember(member.id, 'cpf', text)}
                  placeholder="CPF"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
                
                <View style={[styles.sizeSelector, { marginTop: SPACING.sm }]}>
                  {shirtSizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeOption,
                        member.shirtSize === size && styles.sizeOptionSelected,
                      ]}
                      onPress={() => updateTeamMember(member.id, 'shirtSize', size)}
                    >
                      <Text style={[
                        styles.sizeOptionText,
                        member.shirtSize === size && styles.sizeOptionTextSelected,
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addMemberButton} onPress={addTeamMember}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={styles.addMemberText}>Adicionar Atleta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voucher/Cupom */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cupom de Desconto</Text>
          <View style={styles.voucherContainer}>
            <TextInput
              style={[styles.voucherInput, voucherApplied && styles.voucherInputApplied]}
              value={voucherCode}
              onChangeText={setVoucherCode}
              placeholder="Digite o código do cupom"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              editable={!voucherApplied}
            />
            {voucherApplied ? (
              <TouchableOpacity style={styles.voucherRemoveButton} onPress={handleRemoveVoucher}>
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.voucherApplyButton} 
                onPress={handleApplyVoucher}
                disabled={voucherLoading}
              >
                {voucherLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.voucherApplyText}>Aplicar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {voucherError ? (
            <Text style={styles.voucherError}>{voucherError}</Text>
          ) : voucherApplied ? (
            <Text style={styles.voucherSuccess}>✓ Cupom aplicado: -{formatPrice(voucherDiscount)}</Text>
          ) : null}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categoria</Text>
            {selectedCategory?.isPaid === false ? (
              <View style={styles.freePriceContainer}>
                <Ionicons name="gift" size={14} color="#10b981" />
                <Text style={styles.freePriceText}>Gratuita</Text>
              </View>
            ) : (
              <Text style={styles.summaryValue}>{formatPrice(parseFloat(selectedCategory?.price || '0'))}</Text>
            )}
          </View>
          {selectedKit && parseFloat(selectedKit.additionalPrice || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kit ({selectedKit.name})</Text>
              <Text style={styles.summaryValue}>+{formatPrice(parseFloat(selectedKit.additionalPrice))}</Text>
            </View>
          )}
          {registrationType === 'team' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Atletas</Text>
              <Text style={styles.summaryValue}>x{teamMembers.filter(m => m.selected && m.name).length}</Text>
            </View>
          )}
          {voucherDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Desconto</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>-{formatPrice(voucherDiscount)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(getTotalPrice())}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Confirmar Inscrição</Text>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
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
  eventInfo: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  eventTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 4,
  },
  eventCategory: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  eventKit: {
    ...FONTS.body5,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeOption: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    ...FONTS.body3,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  typeOptionTextSelected: {
    color: COLORS.background,
  },
  typeOptionDesc: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  typeOptionDescSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
  photoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoUploadText: {
    ...FONTS.body5,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
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
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  sizeSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  sizeOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sizeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizeOptionText: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  sizeOptionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  membersTitle: {
    ...FONTS.body3,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  memberCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  memberNumber: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '600',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  addMemberText: {
    ...FONTS.body3,
    color: COLORS.primary,
    fontWeight: '600',
  },
  summary: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SPACING.md,
  },
  summaryTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    ...FONTS.body4,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...FONTS.body4,
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  totalValue: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  submitButtonText: {
    ...FONTS.h4,
    color: COLORS.background,
  },
  voucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...FONTS.body3,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voucherInputApplied: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
  },
  voucherApplyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  voucherApplyText: {
    ...FONTS.body4,
    color: COLORS.background,
    fontWeight: '600',
  },
  voucherRemoveButton: {
    padding: SPACING.xs,
  },
  voucherError: {
    ...FONTS.body5,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  voucherSuccess: {
    ...FONTS.body5,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  // Estilos para categoria gratuita
  categoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  freeCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  freeCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  freePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freePriceText: {
    ...FONTS.body4,
    color: '#10b981',
    fontWeight: '600',
  },
});

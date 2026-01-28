import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
// FileSystem removido - usando base64 direto do ImagePicker
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import api from '../services/api';
import { RootStackParamList } from '../types';

import { useToast } from '../contexts/ToastContext';
type EditEventRouteProp = RouteProp<RootStackParamList, 'EditEvent'>;

// Tipos de evento com suas distâncias específicas
const EVENT_TYPES = [
  { id: 'corrida', label: 'Corrida', icon: 'walk', distances: ['5K', '10K', '15K', '21K (Meia)', '42K (Maratona)'] },
  { id: 'ultramaratona', label: 'Ultramaratona', icon: 'flash', distances: ['50K', '80K', '100K', '100 Milhas', '200K'] },
  { id: 'corrida_montanha', label: 'Corrida de Montanha', icon: 'analytics', distances: ['10K', '21K', '42K', '50K', 'Vertical'] },
  { id: 'trail', label: 'Trail Run', icon: 'trail-sign', distances: ['10K', '21K', '42K', '50K', '80K', '100K', '100 Milhas'] },
  { id: 'triathlon', label: 'Triathlon', icon: 'fitness', distances: ['Sprint', 'Olímpico', 'Half (70.3)', 'Full'] },
  { id: 'duathlon', label: 'Duathlon', icon: 'body', distances: ['Sprint', 'Standard', 'Long'] },
  { id: 'aquathlon', label: 'Aquathlon', icon: 'water', distances: ['Sprint', 'Standard'] },
  { id: 'ironman', label: 'Ironman', icon: 'medal', distances: ['70.3', 'Full (140.6)'] },
  { id: 'ciclismo', label: 'Ciclismo', icon: 'bicycle', distances: ['50km', '100km', '150km', '200km', '300km'] },
  { id: 'mtb', label: 'MTB', icon: 'bicycle', distances: ['XCO', 'XCM', 'Enduro', 'Downhill', 'Marathon'] },
  { id: 'ocr', label: 'Corrida de Obstáculos', icon: 'barbell', distances: ['5K', '10K', '21K', 'Beast', 'Ultra Beast'] },
  { id: 'natacao', label: 'Natação', icon: 'water', distances: ['500m', '1km', '2km', '3km', '5km', '10km'] },
];

const AGE_CATEGORIES = [
  { id: 'juvenil', label: 'Juvenil', description: '14-17 anos' },
  { id: 'adulto', label: 'Adulto', description: '18-39 anos' },
  { id: 'senior', label: 'Sênior', description: '40+ anos' },
  { id: 'qualquer', label: 'Qualquer Idade', description: 'Sem restrição' },
];

const GENDERS = [
  { id: 'masculino', label: 'Masculino' },
  { id: 'feminino', label: 'Feminino' },
  { id: 'misto', label: 'Misto' },
];

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface Category {
  id: string;
  dbId?: number;
  name: string;
  distance: string;
  customDistance: string;
  ageCategory: string;
  gender: string;
  price: string;
  maxParticipants: string;
  isNew?: boolean;
}

const EditEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<EditEventRouteProp>();
  const { eventId } = route.params;
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    description: '',
    eventDate: '',
    eventTime: '',
    city: '',
    state: '',
    organizerName: '', // Nome do organizador/empresa
    isPaidEvent: true, // true = cobrado, false = gratuito
  });
  
  const [eventType, setEventType] = useState('corrida');
  const [flyer, setFlyer] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showStateSelector, setShowStateSelector] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published' | 'cancelled' | 'finished'>('draft');

  const currentEventType = EVENT_TYPES.find(t => t.id === eventType);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      
      // Carregar evento
      const event = await api.getEvent(eventId);
      
      // Formatar data para DD/MM/YYYY
      const eventDate = new Date(event.eventDate);
      const formattedDate = `${String(eventDate.getDate()).padStart(2, '0')}/${String(eventDate.getMonth() + 1).padStart(2, '0')}/${eventDate.getFullYear()}`;
      
      // Extrair hora do eventTime ou do eventDate
      let eventTimeStr = '';
      if (event.eventTime) {
        // eventTime já está no formato HH:mm
        eventTimeStr = event.eventTime;
      } else {
        // Fallback: extrair hora do eventDate (se houver)
        const hours = eventDate.getHours();
        const minutes = eventDate.getMinutes();
        if (hours !== 0 || minutes !== 0) {
          eventTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
      }
      
      setFormData({
        name: event.name || '',
        shortDescription: event.shortDescription || '',
        description: event.description || '',
        eventDate: formattedDate,
        eventTime: eventTimeStr, // Carregar hora do backend
        city: event.city || '',
        state: event.state || '',
        organizerName: event.organizerName || '',
        isPaidEvent: event.isPaidEvent !== false, // Carregar valor atual do backend
      });
      
      setFlyer(event.bannerUrl || null);
      setCurrentStatus(event.status);
      
      // Carregar categorias
      const eventCategories = await api.getEventCategories(eventId);
      const mappedCategories: Category[] = eventCategories.map(cat => {
        const genderMap: { [key: string]: string } = {
          'male': 'masculino',
          'female': 'feminino',
          'mixed': 'misto',
        };
        
        return {
          id: cat.id.toString(),
          dbId: cat.id,
          name: cat.name,
          distance: cat.distance || '',
          customDistance: '',
          ageCategory: 'qualquer', // TODO: mapear de minAge/maxAge
          gender: genderMap[cat.gender] || 'misto',
          price: cat.price?.replace('.', ',') || '0,00',
          maxParticipants: cat.maxParticipants?.toString() || '',
          isNew: false,
        };
      });
      
      setCategories(mappedCategories);
      
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      showToast('Não foi possível carregar o evento.', 'info');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const [flyerBase64, setFlyerBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true, // Solicitar base64 diretamente
    });

    if (!result.canceled) {
      setFlyer(result.assets[0].uri);
      // Guardar base64 para upload
      if (result.assets[0].base64) {
        setFlyerBase64(result.assets[0].base64);
      }
    }
  };

  const formatDateInput = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const formatTimeInput = (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const addCategory = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: '',
      distance: currentEventType?.distances[0] || '',
      customDistance: '',
      ageCategory: 'qualquer',
      gender: 'misto',
      price: '100,00',
      maxParticipants: '500',
      isNew: true,
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, field: keyof Category, value: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      showToast('O nome do evento é obrigatório.', 'info');
      return false;
    }
    if (!formData.eventDate.trim()) {
      showToast('A data do evento é obrigatória.', 'info');
      return false;
    }
    if (!formData.city.trim()) {
      showToast('A cidade é obrigatória.', 'info');
      return false;
    }
    if (!formData.state) {
      showToast('O estado é obrigatório.', 'info');
      return false;
    }
    if (categories.length === 0) {
      showToast('Adicione pelo menos uma categoria.', 'info');
      return false;
    }
    for (const cat of categories) {
      if (!cat.name.trim()) {
        showToast('Todas as categorias precisam ter um nome.', 'info');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (publish: boolean) => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      // Converter data DD/MM/YYYY para Date
      const [day, month, year] = formData.eventDate.split('/');
      const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Upload do banner se for uma nova imagem local (tem base64 disponível)
      let bannerUrl: string | undefined = flyer || undefined;
      if (flyerBase64) {
        console.log('Fazendo upload do novo banner...');
        try {
          // Determinar tipo de arquivo
          const extension = flyer?.split('.').pop()?.toLowerCase() || 'jpg';
          const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
          const filename = `event_banner_${eventId}_${Date.now()}.${extension}`;
          
          // Upload para o servidor usando base64 já disponível
          const uploadResult = await api.uploadImage(flyerBase64, filename, contentType, 'events');
          
          if (uploadResult.success && uploadResult.url) {
            bannerUrl = uploadResult.url;
            console.log('Banner atualizado:', bannerUrl);
          } else {
            console.warn('Upload do banner falhou, mantendo banner atual');
            bannerUrl = undefined; // Não atualizar se falhou
          }
        } catch (uploadError) {
          console.error('Erro no upload do banner:', uploadError);
          showToast('Erro no upload do banner', 'error');
          // Continuar sem atualizar o banner
          bannerUrl = undefined;
        }
      }
      
      // Atualizar evento
      await api.updateEvent(eventId, {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        eventDate: eventDate,
        eventTime: formData.eventTime || undefined, // HH:mm format
        city: formData.city,
        state: formData.state,
        bannerUrl: bannerUrl,
        status: publish ? 'published' : currentStatus,
        organizerName: formData.organizerName || undefined, // Nome do organizador/empresa
        isPaidEvent: formData.isPaidEvent, // Gratuito ou Cobrado
      });
      
      // TODO: Atualizar categorias existentes e criar novas
      // Por enquanto, apenas criar novas categorias
      for (const cat of categories) {
        if (cat.isNew) {
          const genderMap: { [key: string]: 'male' | 'female' | 'mixed' } = {
            'masculino': 'male',
            'feminino': 'female',
            'misto': 'mixed',
          };
          
          await api.createCategory({
            eventId: eventId,
            name: cat.name,
            distance: cat.customDistance || cat.distance,
            ageGroup: cat.ageCategory,
            gender: genderMap[cat.gender] || 'mixed',
            price: cat.price.replace(',', '.'),
            maxParticipants: parseInt(cat.maxParticipants) || undefined,
          });
        }
      }
      
      showToast('Evento atualizado com sucesso!', 'success');
        setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      console.error('Erro ao atualizar evento:', error);
      showToast(error?.message || 'Não foi possível atualizar o evento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando evento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Evento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons 
            name={currentStatus === 'published' ? 'checkmark-circle' : 'time'} 
            size={16} 
            color={currentStatus === 'published' ? COLORS.primary : COLORS.warning} 
          />
          <Text style={[
            styles.statusText,
            { color: currentStatus === 'published' ? COLORS.primary : COLORS.warning }
          ]}>
            {currentStatus === 'published' ? 'Publicado' : 
             currentStatus === 'draft' ? 'Rascunho' :
             currentStatus === 'cancelled' ? 'Cancelado' : 'Finalizado'}
          </Text>
        </View>

        {/* Flyer */}
        <Text style={styles.sectionTitle}>Flyer do Evento</Text>
        <TouchableOpacity style={styles.flyerContainer} onPress={pickImage}>
          {flyer ? (
            <Image source={{ uri: flyer }} style={styles.flyerImage} />
          ) : (
            <View style={styles.flyerPlaceholder}>
              <Ionicons name="image-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.flyerPlaceholderText}>Toque para adicionar</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tipo de Evento */}
        <Text style={styles.sectionTitle}>Tipo de Evento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesContainer}>
          {EVENT_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeOption, eventType === type.id && styles.typeOptionSelected]}
              onPress={() => setEventType(type.id)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={eventType === type.id ? COLORS.background : COLORS.textSecondary} 
              />
              <Text style={[styles.typeOptionText, eventType === type.id && styles.typeOptionTextSelected]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Informações Básicas */}
        <Text style={styles.sectionTitle}>Informações do Evento</Text>
        
        <Text style={styles.label}>Nome do Evento *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Maratona de São Paulo 2024"
          placeholderTextColor={COLORS.textMuted}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <Text style={styles.label}>Descrição Curta</Text>
        <TextInput
          style={styles.input}
          placeholder="Uma frase sobre o evento"
          placeholderTextColor={COLORS.textMuted}
          value={formData.shortDescription}
          onChangeText={(text) => setFormData({ ...formData, shortDescription: text })}
        />

        <Text style={styles.label}>Descrição Completa</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Detalhes do evento, regulamento, etc."
          placeholderTextColor={COLORS.textMuted}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />

        {/* Data e Hora */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textMuted}
              value={formData.eventDate}
              onChangeText={(text) => setFormData({ ...formData, eventDate: formatDateInput(text) })}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Hora</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.textMuted}
              value={formData.eventTime}
              onChangeText={(text) => setFormData({ ...formData, eventTime: formatTimeInput(text) })}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
        </View>

        {/* Localização */}
        <Text style={styles.sectionTitle}>Localização</Text>
        
        <Text style={styles.label}>Cidade *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: São Paulo"
          placeholderTextColor={COLORS.textMuted}
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
        />

        <Text style={styles.label}>Estado *</Text>
        <TouchableOpacity 
          style={styles.stateSelector}
          onPress={() => setShowStateSelector(!showStateSelector)}
        >
          <Text style={formData.state ? styles.stateSelectorText : styles.stateSelectorPlaceholder}>
            {formData.state || 'Selecione o estado'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {showStateSelector && (
          <View style={styles.stateList}>
            {ESTADOS.map(estado => (
              <TouchableOpacity
                key={estado}
                style={[styles.stateItem, formData.state === estado && styles.stateItemSelected]}
                onPress={() => {
                  setFormData({ ...formData, state: estado });
                  setShowStateSelector(false);
                }}
              >
                <Text style={[styles.stateItemText, formData.state === estado && styles.stateItemTextSelected]}>
                  {estado}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Organizador */}
        <Text style={styles.sectionTitle}>Organizador</Text>
        
        <Text style={styles.label}>Nome do Organizador / Empresa</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Assessoria Esportiva XYZ"
          placeholderTextColor={COLORS.textMuted}
          value={formData.organizerName}
          onChangeText={(text) => setFormData({ ...formData, organizerName: text })}
        />
        <Text style={styles.helperText}>
          Nome que aparece na listagem de eventos
        </Text>

        {/* Tipo de Inscrição: Gratuito ou Cobrado */}
        <Text style={styles.sectionTitle}>Tipo de Inscrição</Text>
        <Text style={styles.helperText}>
          Este evento será gratuito ou terá cobrança de inscrição?
        </Text>
        <View style={styles.pricingTypeRow}>
          <TouchableOpacity
            style={[
              styles.pricingTypeOption,
              !formData.isPaidEvent && styles.pricingTypeOptionFree,
            ]}
            onPress={() => {
              setFormData({ ...formData, isPaidEvent: false });
              // Forçar todas categorias como gratuitas
              setCategories(categories.map(cat => ({
                ...cat,
                price: '0,00',
              })));
            }}
          >
            <Ionicons 
              name="gift-outline" 
              size={24} 
              color={!formData.isPaidEvent ? '#10b981' : COLORS.textMuted} 
            />
            <Text style={[
              styles.pricingTypeText,
              !formData.isPaidEvent && styles.pricingTypeTextFree,
            ]}>
              Gratuito
            </Text>
            <Text style={styles.pricingTypeDesc}>
              Sem cobrança de inscrição
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.pricingTypeOption,
              formData.isPaidEvent && styles.pricingTypeOptionPaid,
            ]}
            onPress={() => setFormData({ ...formData, isPaidEvent: true })}
          >
            <Ionicons 
              name="card-outline" 
              size={24} 
              color={formData.isPaidEvent ? COLORS.primary : COLORS.textMuted} 
            />
            <Text style={[
              styles.pricingTypeText,
              formData.isPaidEvent && styles.pricingTypeTextPaid,
            ]}>
              Cobrar Inscrição
            </Text>
            <Text style={styles.pricingTypeDesc}>
              Definir preços por categoria
            </Text>
          </TouchableOpacity>
        </View>
        
        {!formData.isPaidEvent && (
          <View style={styles.freeEventNotice}>
            <Ionicons name="information-circle" size={18} color="#10b981" />
            <Text style={styles.freeEventNoticeText}>
              Evento gratuito: todas as categorias serão automáticamente gratuitas.
            </Text>
          </View>
        )}

        {/* Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity style={styles.addButton} onPress={addCategory}>
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCategories}>
            <Ionicons name="layers-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyCategoriesText}>Nenhuma categoria adicionada</Text>
            <Text style={styles.emptyCategoriesSubtext}>Toque em "Adicionar" para criar uma categoria</Text>
          </View>
        ) : (
          categories.map((category, index) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryNumber}>Categoria {index + 1}</Text>
                {category.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>Nova</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => removeCategory(category.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome da Categoria *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Elite Masculino, Amador 5K"
                placeholderTextColor={COLORS.textMuted}
                value={category.name}
                onChangeText={(text) => updateCategory(category.id, 'name', text)}
              />

              <Text style={styles.label}>Distância</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distancesRow}>
                {currentEventType?.distances.map(dist => (
                  <TouchableOpacity
                    key={dist}
                    style={[styles.distanceChip, category.distance === dist && styles.distanceChipSelected]}
                    onPress={() => updateCategory(category.id, 'distance', dist)}
                  >
                    <Text style={[styles.distanceChipText, category.distance === dist && styles.distanceChipTextSelected]}>
                      {dist}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.distanceChip, !category.distance && styles.distanceChipSelected]}
                  onPress={() => updateCategory(category.id, 'distance', '')}
                >
                  <Text style={[styles.distanceChipText, !category.distance && styles.distanceChipTextSelected]}>
                    Outra
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {(category.customDistance || !category.distance) && (
                <TextInput
                  style={[styles.input, styles.customDistanceInput]}
                  placeholder="Digite a distância (ex: 25km, 3000m, Sprint)"
                  placeholderTextColor={COLORS.textMuted}
                  value={category.customDistance}
                  onChangeText={(text) => updateCategory(category.id, 'customDistance', text)}
                />
              )}

              <Text style={styles.label}>Faixa Etária</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                {AGE_CATEGORIES.map(age => (
                  <TouchableOpacity
                    key={age.id}
                    style={[styles.optionChip, category.ageCategory === age.id && styles.optionChipSelected]}
                    onPress={() => updateCategory(category.id, 'ageCategory', age.id)}
                  >
                    <Text style={[styles.optionChipText, category.ageCategory === age.id && styles.optionChipTextSelected]}>
                      {age.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Gênero</Text>
              <View style={styles.genderRow}>
                {GENDERS.map(gender => (
                  <TouchableOpacity
                    key={gender.id}
                    style={[styles.genderOption, category.gender === gender.id && styles.genderOptionSelected]}
                    onPress={() => updateCategory(category.id, 'gender', gender.id)}
                  >
                    <Text style={[styles.genderOptionText, category.gender === gender.id && styles.genderOptionTextSelected]}>
                      {gender.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preço e Vagas - Preço só aparece se evento for cobrado */}
              <View style={styles.row}>
                {formData.isPaidEvent ? (
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Preço (R$)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100,00"
                      placeholderTextColor={COLORS.textMuted}
                      value={category.price}
                      onChangeText={(text) => updateCategory(category.id, 'price', text)}
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>Preço</Text>
                    <View style={styles.freePriceBadge}>
                      <Ionicons name="gift" size={16} color="#10b981" />
                      <Text style={styles.freePriceText}>Gratuita</Text>
                    </View>
                  </View>
                )}
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Máx. Vagas</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="500"
                    placeholderTextColor={COLORS.textMuted}
                    value={category.maxParticipants}
                    onChangeText={(text) => updateCategory(category.id, 'maxParticipants', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable 
          style={styles.draftButton}
          onPress={() => handleSubmit(false)}
          disabled={saving}
        >
          <Text style={styles.draftButtonText}>Salvar</Text>
        </Pressable>
        <Pressable 
          style={styles.publishButton}
          onPress={() => handleSubmit(true)}
          disabled={saving}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark || '#65a30d']}
            style={styles.publishButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color={COLORS.background} />
                <Text style={styles.publishButtonText}>
                  {currentStatus === 'published' ? 'Atualizar' : 'Publicar'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

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
    color: COLORS.textMuted,
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  flyerContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  flyerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  flyerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flyerPlaceholderText: {
    color: COLORS.textMuted,
    marginTop: 8,
  },
  typesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    minWidth: 80,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  typeOptionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  stateSelector: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateSelectorText: {
    color: COLORS.white,
    fontSize: 16,
  },
  stateSelectorPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  stateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  stateItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
  },
  stateItemSelected: {
    backgroundColor: COLORS.primary,
  },
  stateItemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  stateItemTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyCategories: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  emptyCategoriesText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  emptyCategoriesSubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  newBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  newBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
  },
  distancesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  distanceChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
  },
  distanceChipSelected: {
    backgroundColor: COLORS.primary,
  },
  distanceChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  distanceChipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  customDistanceInput: {
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  optionChipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  genderOptionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  genderOptionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  draftButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  publishButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  // Estilos para seção Gratuito/Cobrado
  pricingTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  pricingTypeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pricingTypeOptionFree: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  pricingTypeOptionPaid: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  pricingTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  pricingTypeTextFree: {
    color: '#10b981',
  },
  pricingTypeTextPaid: {
    color: COLORS.primary,
  },
  pricingTypeDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  freeEventNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  freeEventNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#10b981',
  },
  freePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  freePriceText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditEventScreen;

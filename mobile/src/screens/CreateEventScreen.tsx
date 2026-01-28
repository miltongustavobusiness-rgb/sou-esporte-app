import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useToast } from '../contexts/ToastContext';
// Usando contexto para obter usuário logado
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

// Tipos de evento com suas distâncias específicas
const EVENT_TYPES = [
  { 
    id: 'corrida', 
    label: 'Corrida', 
    icon: 'walk',
    distances: ['5K', '10K', '15K', '21K (Meia)', '42K (Maratona)']
  },
  { 
    id: 'ultramaratona', 
    label: 'Ultramaratona', 
    icon: 'flash',
    distances: ['50K', '80K', '100K', '100 Milhas', '200K']
  },
  { 
    id: 'corrida_montanha', 
    label: 'Corrida de Montanha', 
    icon: 'analytics',
    distances: ['10K', '21K', '42K', '50K', 'Vertical']
  },
  { 
    id: 'trail', 
    label: 'Trail Run', 
    icon: 'trail-sign',
    distances: ['10K', '21K', '42K', '50K', '80K', '100K', '100 Milhas']
  },
  { 
    id: 'triathlon', 
    label: 'Triathlon', 
    icon: 'fitness',
    distances: ['Sprint', 'Olímpico', 'Half (70.3)', 'Full']
  },
  { 
    id: 'duathlon', 
    label: 'Duathlon', 
    icon: 'body',
    distances: ['Sprint', 'Standard', 'Long']
  },
  { 
    id: 'aquathlon', 
    label: 'Aquathlon', 
    icon: 'water',
    distances: ['Sprint', 'Standard']
  },
  { 
    id: 'ironman', 
    label: 'Ironman', 
    icon: 'medal',
    distances: ['70.3', 'Full (140.6)']
  },
  { 
    id: 'ciclismo', 
    label: 'Ciclismo', 
    icon: 'bicycle',
    distances: ['50km', '100km', '150km', '200km', '300km']
  },
  { 
    id: 'mtb', 
    label: 'MTB', 
    icon: 'bicycle',
    distances: ['XCO', 'XCM', 'Enduro', 'Downhill', 'Marathon']
  },
  { 
    id: 'ocr', 
    label: 'Corrida de Obstáculos', 
    icon: 'barbell',
    distances: ['5K', '10K', '21K', 'Beast', 'Ultra Beast']
  },
  { 
    id: 'natacao', 
    label: 'Natação', 
    icon: 'water',
    distances: ['500m', '1km', '2km', '3km', '5km', '10km']
  },
];

// Categorias de idade
const AGE_CATEGORIES = [
  { id: 'juvenil', label: 'Juvenil', description: '14-17 anos' },
  { id: 'adulto', label: 'Adulto', description: '18-39 anos' },
  { id: 'senior', label: 'Sênior', description: '40+ anos' },
  { id: 'qualquer', label: 'Qualquer Idade', description: 'Sem restrição' },
];

// Gêneros
const GENDERS = [
  { id: 'masculino', label: 'Masculino' },
  { id: 'feminino', label: 'Feminino' },
  { id: 'misto', label: 'Misto' },
];

// Estados brasileiros
const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface Category {
  id: string;
  name: string;
  distance: string;
  customDistance: string;
  ageCategory: string;
  gender: string;
  isPaid: boolean; // true = categoria paga, false = categoria gratuita
  price: string;
  maxParticipants: string;
}

const CreateEventScreen = () => {
  const navigation = useNavigation();
  const { user } = useApp();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    description: '',
    eventDate: '',
    eventTime: '',
    city: '',
    state: '',
    organizerName: '', // Nome do organizador/empresa
    isPaidEvent: true, // true = evento pago, false = evento gratuito
  });
  
  // Event type and flyer
  const [eventType, setEventType] = useState('corrida');
  const [flyer, setFlyer] = useState<string | null>(null);
  const [flyerBase64, setFlyerBase64] = useState<string | null>(null);
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [showStateSelector, setShowStateSelector] = useState(false);

  // Get current event type config
  const currentEventType = EVENT_TYPES.find(t => t.id === eventType);

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
      isPaid: formData.isPaidEvent, // Herda do evento, mas pode ser alterado
      price: formData.isPaidEvent ? '100,00' : '0',
      maxParticipants: '500',
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, field: keyof Category, value: string | boolean) => {
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
    
    setLoading(true);
    try {
      // Converter data DD/MM/YYYY para Date
      const [day, month, year] = formData.eventDate.split('/');
      const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Gerar slug a partir do nome
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();
      
      // Upload do banner se houver uma imagem selecionada (tem base64 disponível)
      let bannerUrl: string | undefined = undefined;
      if (flyerBase64) {
        console.log('Fazendo upload do banner...');
        try {
          // Determinar tipo de arquivo
          const extension = flyer?.split('.').pop()?.toLowerCase() || 'jpg';
          const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
          const filename = `event_banner_${Date.now()}.${extension}`;
          
          // Upload para o servidor usando base64 já disponível
          const uploadResult = await api.uploadImage(flyerBase64, filename, contentType, 'events');
          
          if (uploadResult.success && uploadResult.url) {
            bannerUrl = uploadResult.url;
            console.log('Banner uploaded:', bannerUrl);
          } else {
            console.warn('Upload do banner falhou, continuando sem banner');
          }
        } catch (uploadError) {
          console.error('Erro no upload do banner:', uploadError);
          // Continuar sem banner em caso de erro
        }
      } else if (flyer && flyer.startsWith('http')) {
        // Já é uma URL válida
        bannerUrl = flyer;
      }
      
      console.log('Criando evento no backend...');
      
      // Criar evento no backend com organizerId do usuário logado
      const result = await api.createEvent({
        name: formData.name,
        slug: slug,
        description: formData.description,
        shortDescription: formData.shortDescription,
        eventDate: eventDate,
        eventTime: formData.eventTime,
        city: formData.city,
        state: formData.state,
        eventType: eventType,
        bannerUrl: bannerUrl,
        status: publish ? 'published' : 'draft',
        organizerId: user?.id, // Associar evento ao organizador logado
        organizerName: formData.organizerName || user?.name, // Nome do organizador/empresa (usa nome do usuário se não informado)
        isPaidEvent: formData.isPaidEvent, // Evento gratuito ou pago
      });
      
      console.log('Evento criado com ID:', result.id);
      
      // Criar categorias no backend
      for (const cat of categories) {
        const genderMap: { [key: string]: 'male' | 'female' | 'mixed' } = {
          'masculino': 'male',
          'feminino': 'female',
          'misto': 'mixed',
        };
        
        await api.createCategory({
          eventId: result.id,
          name: cat.name,
          distance: cat.customDistance || cat.distance,
          ageGroup: cat.ageCategory,
          gender: genderMap[cat.gender] || 'mixed',
          isPaid: cat.isPaid, // Categoria gratuita ou paga
          price: cat.isPaid ? cat.price.replace(',', '.') : '0', // Se gratuita, preço = 0
          maxParticipants: parseInt(cat.maxParticipants) || undefined,
        });
        console.log('Categoria criada:', cat.name);
      }
      
      showToast(publish ? 'Evento publicado com sucesso!' : 'Rascunho salvo com sucesso!', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      console.error('Erro ao criar evento:', error);
      showToast(error?.message || 'Não foi possível salvar o evento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Evento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              onPress={() => {
                setEventType(type.id);
                // Reset categories when type changes
                setCategories([]);
              }}
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

        {/* Tipo de Cobrança */}
        <Text style={styles.sectionTitle}>Tipo de Inscrição</Text>
        <Text style={styles.helperText}>Este evento será gratuito ou terá cobrança de inscrição?</Text>
        <View style={styles.pricingTypeContainer}>
          <TouchableOpacity
            style={[
              styles.pricingTypeOption,
              !formData.isPaidEvent && styles.pricingTypeOptionSelected,
              !formData.isPaidEvent && styles.pricingTypeOptionFree
            ]}
            onPress={() => {
              setFormData({ ...formData, isPaidEvent: false });
              // Atualizar todas as categorias para gratuitas
              setCategories(categories.map(cat => ({ ...cat, isPaid: false, price: '0' })));
            }}
          >
            <Ionicons 
              name="gift-outline" 
              size={28} 
              color={!formData.isPaidEvent ? '#10b981' : COLORS.textMuted} 
            />
            <Text style={[
              styles.pricingTypeLabel,
              !formData.isPaidEvent && styles.pricingTypeLabelSelected,
              !formData.isPaidEvent && { color: '#10b981' }
            ]}>
              Gratuito
            </Text>
            <Text style={styles.pricingTypeDesc}>
              Inscrições sem custo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.pricingTypeOption,
              formData.isPaidEvent && styles.pricingTypeOptionSelected,
              formData.isPaidEvent && styles.pricingTypeOptionPaid
            ]}
            onPress={() => setFormData({ ...formData, isPaidEvent: true })}
          >
            <Ionicons 
              name="card-outline" 
              size={28} 
              color={formData.isPaidEvent ? COLORS.primary : COLORS.textMuted} 
            />
            <Text style={[
              styles.pricingTypeLabel,
              formData.isPaidEvent && styles.pricingTypeLabelSelected
            ]}>
              Cobrar Inscrição
            </Text>
            <Text style={styles.pricingTypeDesc}>
              Defina preços por categoria
            </Text>
          </TouchableOpacity>
        </View>

        {/* Informações Básicas */}
        <Text style={styles.sectionTitle}>Informações Básicas</Text>
        
        <Text style={styles.label}>Nome do Evento *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Maratona de São Paulo 2026"
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
          placeholder="Descreva o evento em detalhes: percurso, premiação, estrutura, regulamento, etc."
          placeholderTextColor={COLORS.textMuted}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

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
            <Text style={styles.label}>Horário</Text>
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

        {/* Local */}
        <Text style={styles.sectionTitle}>Local</Text>
        
        <View style={styles.row}>
          <View style={styles.twoThirdsInput}>
            <Text style={styles.label}>Cidade *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: São Paulo"
              placeholderTextColor={COLORS.textMuted}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>
          <View style={styles.oneThirdInput}>
            <Text style={styles.label}>Estado *</Text>
            <TouchableOpacity 
              style={styles.selectInput}
              onPress={() => setShowStateSelector(!showStateSelector)}
            >
              <Text style={formData.state ? styles.selectText : styles.selectPlaceholder}>
                {formData.state || 'UF'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {showStateSelector && (
          <View style={styles.stateSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ESTADOS.map(estado => (
                <TouchableOpacity
                  key={estado}
                  style={[styles.stateOption, formData.state === estado && styles.stateOptionSelected]}
                  onPress={() => {
                    setFormData({ ...formData, state: estado });
                    setShowStateSelector(false);
                  }}
                >
                  <Text style={[styles.stateOptionText, formData.state === estado && styles.stateOptionTextSelected]}>
                    {estado}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Organizador */}
        <Text style={styles.sectionTitle}>Organizador</Text>
        
        <Text style={styles.label}>Nome do Organizador / Empresa</Text>
        <TextInput
          style={styles.input}
          placeholder={user?.name || 'Ex: Assessoria Esportiva XYZ'}
          placeholderTextColor={COLORS.textMuted}
          value={formData.organizerName}
          onChangeText={(text) => setFormData({ ...formData, organizerName: text })}
        />
        <Text style={styles.helperText}>
          Deixe em branco para usar seu nome ({user?.name})
        </Text>

        {/* Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity style={styles.addButton} onPress={addCategory}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyCategories}>
            <Ionicons name="layers-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyCategoriesText}>Nenhuma categoria adicionada</Text>
            <Text style={styles.emptyCategoriesSubtext}>Toque em "Adicionar" para criar categorias</Text>
          </View>
        ) : (
          categories.map((category, index) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryNumber}>Categoria {index + 1}</Text>
                <TouchableOpacity onPress={() => removeCategory(category.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nome da Categoria *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Elite Masculino"
                placeholderTextColor={COLORS.textMuted}
                value={category.name}
                onChangeText={(text) => updateCategory(category.id, 'name', text)}
              />

              {/* Distância */}
              <Text style={styles.label}>Distância</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                {currentEventType?.distances.map(distance => (
                  <Pressable
                    key={distance}
                    style={[styles.optionChip, category.distance === distance && !category.customDistance && styles.optionChipSelected]}
                    onPress={() => {
                      updateCategory(category.id, 'distance', distance);
                      updateCategory(category.id, 'customDistance', '');
                    }}
                  >
                    <Text style={[styles.optionChipText, category.distance === distance && !category.customDistance && styles.optionChipTextSelected]}>
                      {distance}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.optionChip, styles.customChip, category.customDistance && styles.optionChipSelected]}
                  onPress={() => {
                    updateCategory(category.id, 'distance', '');
                  }}
                >
                  <Ionicons name="create-outline" size={16} color={category.customDistance ? COLORS.background : COLORS.textSecondary} />
                  <Text style={[styles.optionChipText, category.customDistance && styles.optionChipTextSelected]}>
                    Outra
                  </Text>
                </Pressable>
              </ScrollView>
              
              {/* Campo de distância personalizada */}
              {(category.customDistance || !category.distance) && (
                <TextInput
                  style={[styles.input, styles.customDistanceInput]}
                  placeholder="Digite a distância (ex: 25km, 3000m, Sprint)"
                  placeholderTextColor={COLORS.textMuted}
                  value={category.customDistance}
                  onChangeText={(text) => updateCategory(category.id, 'customDistance', text)}
                />
              )}

              {/* Categoria de Idade */}
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

              {/* Gênero */}
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

              {/* Tipo de Cobrança da Categoria (só mostra se evento é pago) */}
              {formData.isPaidEvent && (
                <>
                  <Text style={styles.label}>Cobrança desta Categoria</Text>
                  <View style={styles.categoryPricingRow}>
                    <TouchableOpacity
                      style={[
                        styles.categoryPricingOption,
                        !category.isPaid && styles.categoryPricingOptionSelected,
                        !category.isPaid && styles.categoryPricingOptionFree
                      ]}
                      onPress={() => {
                        updateCategory(category.id, 'isPaid', false);
                        updateCategory(category.id, 'price', '0');
                      }}
                    >
                      <Ionicons 
                        name="gift-outline" 
                        size={18} 
                        color={!category.isPaid ? '#10b981' : COLORS.textMuted} 
                      />
                      <Text style={[
                        styles.categoryPricingLabel,
                        !category.isPaid && { color: '#10b981', fontWeight: '600' }
                      ]}>
                        Gratuita
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.categoryPricingOption,
                        category.isPaid && styles.categoryPricingOptionSelected,
                        category.isPaid && styles.categoryPricingOptionPaid
                      ]}
                      onPress={() => {
                        updateCategory(category.id, 'isPaid', true);
                        if (category.price === '0') {
                          updateCategory(category.id, 'price', '100,00');
                        }
                      }}
                    >
                      <Ionicons 
                        name="card-outline" 
                        size={18} 
                        color={category.isPaid ? COLORS.primary : COLORS.textMuted} 
                      />
                      <Text style={[
                        styles.categoryPricingLabel,
                        category.isPaid && { color: COLORS.primary, fontWeight: '600' }
                      ]}>
                        Paga
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Preço e Vagas */}
              <View style={styles.row}>
                {/* Campo de preço - só mostra se categoria é paga */}
                {(formData.isPaidEvent && category.isPaid) ? (
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
                    <View style={[styles.input, styles.freeIndicator]}>
                      <Ionicons name="gift" size={16} color="#10b981" />
                      <Text style={styles.freeIndicatorText}>Gratuita</Text>
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
          disabled={loading}
        >
          <Text style={styles.draftButtonText}>Salvar Rascunho</Text>
        </Pressable>
        <Pressable 
          style={styles.publishButton}
          onPress={() => handleSubmit(true)}
          disabled={loading}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark || '#65a30d']}
            style={styles.publishButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color={COLORS.background} />
                <Text style={styles.publishButtonText}>Publicar</Text>
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
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  twoThirdsInput: {
    flex: 2,
  },
  oneThirdInput: {
    flex: 1,
  },
  selectInput: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 15,
    color: COLORS.white,
  },
  selectPlaceholder: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  stateSelector: {
    marginTop: 8,
    marginBottom: 8,
  },
  stateOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  stateOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  stateOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stateOptionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 40,
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
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  optionsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  optionChipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    borderStyle: 'dashed',
  },
  customDistanceInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  genderOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  genderOptionTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 30,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
  },
  draftButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  publishButton: {
    flex: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  publishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  publishButtonText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 15,
  },
  // Estilos para tipo de cobrança do evento
  pricingTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pricingTypeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pricingTypeOptionSelected: {
    borderColor: COLORS.primary,
  },
  pricingTypeOptionFree: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  pricingTypeOptionPaid: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.1)',
  },
  pricingTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  pricingTypeLabelSelected: {
    color: COLORS.primary,
  },
  pricingTypeDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  // Estilos para cobrança por categoria
  categoryPricingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  categoryPricingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPricingOptionSelected: {
    borderWidth: 1,
  },
  categoryPricingOptionFree: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  categoryPricingOptionPaid: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
  },
  categoryPricingLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Indicador de categoria gratuita
  freeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  freeIndicatorText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CreateEventScreen;

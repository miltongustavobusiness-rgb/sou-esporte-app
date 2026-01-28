import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS, SHADOWS } from '../constants/theme';
import { useFilters, categoryToType } from '../contexts/FiltersContext';
import CityAutocomplete from './CityAutocomplete';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

export interface FilterValues {
  dateStart?: string;
  dateEnd?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  state?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  distance?: number;
  pricingType?: 'all' | 'free' | 'paid'; // Filtro de gratuito/pago
}

// Modalidades Esportivas (não confundir com "Categoria" de inscrição como 5K, 10K, etc.)
const MODALITIES = [
  { id: 'all', label: 'Todas' },
  { id: 'running', label: 'Corrida' },
  { id: 'ultramaratona', label: 'Ultramaratona' },
  { id: 'corrida_montanha', label: 'Corrida de Montanha' },
  { id: 'trail', label: 'Trail Run' },
  { id: 'triathlon', label: 'Triathlon' },
  { id: 'duathlon', label: 'Duathlon' },
  { id: 'aquathlon', label: 'Aquathlon' },
  { id: 'ironman', label: 'Ironman' },
  { id: 'cycling', label: 'Ciclismo' },
  { id: 'mtb', label: 'MTB' },
  { id: 'ocr', label: 'Corrida de Obstáculos' },
  { id: 'swimming', label: 'Natação' },
  { id: 'other', label: 'Outros' },
];

// CITIES list removed - now using CityAutocomplete component with dynamic search

export default function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
  // Usar o FiltersContext para estado global
  const { filters, setCity, setState, setDateFrom, setDateTo, setCategory, setMinPrice: setGlobalMinPrice, setMaxPrice: setGlobalMaxPrice, setOrganizer, setPricingType: setGlobalPricingType, resetFilters } = useFilters();
  
  // Estados locais para o modal
  const [dateStart, setDateStart] = useState(initialFilters?.dateStart || '');
  const [dateEnd, setDateEnd] = useState(initialFilters?.dateEnd || '');
  const [selectedCity, setSelectedCity] = useState(initialFilters?.city || filters.city || '');
  const [selectedState, setSelectedState] = useState(initialFilters?.state || filters.state || '');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || filters.category || 'all');
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice?.toString() || filters.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice?.toString() || filters.maxPrice?.toString() || '');
  const [selectedDistance, setSelectedDistance] = useState(initialFilters?.distance?.toString() || '');
  const [selectedOrganizer, setSelectedOrganizer] = useState(filters.organizer || '');
  const [pricingType, setPricingType] = useState<'all' | 'free' | 'paid'>(filters.pricingType || 'all'); // Filtro de gratuito/pago

  // Converter data DD/MM/AAAA para formato ISO
  const parseDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return undefined;
  };

  const handleApply = () => {
    // Usar cidade e estado selecionados diretamente
    const city = selectedCity || null;
    const state = selectedState || null;

    // Mapear categoria para tipo de evento (usando import do FiltersContext)
    const localCategoryToType: Record<string, string> = {
      'running': 'corrida',
      'ultramaratona': 'ultramaratona',
      'corrida_montanha': 'corrida_montanha',
      'trail': 'trail',
      'triathlon': 'triathlon',
      'duathlon': 'duathlon',
      'aquathlon': 'aquathlon',
      'ironman': 'ironman',
      'cycling': 'ciclismo',
      'mtb': 'mtb',
      'ocr': 'ocr',
      'swimming': 'natacao',
      'other': 'outro',
    };

    // Atualizar o contexto global de filtros
    const parsedCity = city;
    const parsedState = state;
    const parsedCategory = selectedCategory === 'all' ? null : localCategoryToType[selectedCategory] || selectedCategory;
    const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;
    const parsedDateFrom = parseDate(dateStart) || null;
    const parsedDateTo = parseDate(dateEnd) || null;

    // Atualizar contexto global
    setCity(parsedCity);
    setState(parsedState);
    setCategory(parsedCategory);
    if (parsedMinPrice !== undefined) setGlobalMinPrice(parsedMinPrice);
    if (parsedMaxPrice !== undefined) setGlobalMaxPrice(parsedMaxPrice);
    setDateFrom(parsedDateFrom);
    setDateTo(parsedDateTo);
    setOrganizer(selectedOrganizer || null);
    setGlobalPricingType(pricingType);

    // Callback para compatibilidade com componentes existentes
    onApply({
      dateStart,
      dateEnd,
      dateFrom: parseDate(dateStart),
      dateTo: parseDate(dateEnd),
      city: parsedCity || undefined,
      state: parsedState || undefined,
      category: parsedCategory || undefined,
      minPrice: pricingType === 'free' ? undefined : parsedMinPrice,
      maxPrice: pricingType === 'free' ? undefined : parsedMaxPrice,
      distance: selectedDistance ? parseFloat(selectedDistance) : undefined,
      pricingType: pricingType,
    });
    onClose();
  };

  const handleClear = () => {
    // Limpar estados locais
    setDateStart('');
    setDateEnd('');
    setSelectedCity('');
    setSelectedState('');
    setSelectedCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setSelectedDistance('');
    setSelectedOrganizer('');
    setPricingType('all');
    // Resetar contexto global
    resetFilters();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                  <Text style={styles.title}>Filtros</Text>
                  <TouchableOpacity onPress={handleClear}>
                    <Text style={styles.clearText}>Limpar</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Data */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data do Evento</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>De</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={COLORS.textMuted}
                    value={dateStart}
                    onChangeText={setDateStart}
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>Até</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={COLORS.textMuted}
                    value={dateEnd}
                    onChangeText={setDateEnd}
                  />
                </View>
              </View>
            </View>

            {/* Cidade */}
            <View style={[styles.section, { zIndex: 1000 }]}>
              <Text style={styles.sectionTitle}>Cidade</Text>
              <CityAutocomplete
                value={selectedCity ? `${selectedCity}${selectedState ? `, ${selectedState}` : ''}` : ''}
                onSelect={(city, state) => {
                  setSelectedCity(city);
                  setSelectedState(state);
                }}
                onClear={() => {
                  setSelectedCity('');
                  setSelectedState('');
                }}
                placeholder="Digite o nome da cidade"
              />
            </View>

            {/* Modalidade Esportiva */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Modalidade Esportiva</Text>
              <View style={styles.optionsGrid}>
                {MODALITIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.optionChip,
                      selectedCategory === cat.id && styles.optionChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedCategory === cat.id && styles.optionChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tipo de Inscrição */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Inscrição</Text>
              <View style={styles.pricingTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.pricingTypeOption,
                    pricingType === 'all' && styles.pricingTypeOptionActive,
                  ]}
                  onPress={() => setPricingType('all')}
                >
                  <Ionicons 
                    name="apps-outline" 
                    size={20} 
                    color={pricingType === 'all' ? COLORS.background : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.pricingTypeText,
                    pricingType === 'all' && styles.pricingTypeTextActive,
                  ]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.pricingTypeOption,
                    pricingType === 'free' && styles.pricingTypeOptionFree,
                  ]}
                  onPress={() => setPricingType('free')}
                >
                  <Ionicons 
                    name="gift-outline" 
                    size={20} 
                    color={pricingType === 'free' ? '#10b981' : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.pricingTypeText,
                    pricingType === 'free' && { color: '#10b981', fontWeight: '600' },
                  ]}>
                    Gratuitos
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.pricingTypeOption,
                    pricingType === 'paid' && styles.pricingTypeOptionPaid,
                  ]}
                  onPress={() => setPricingType('paid')}
                >
                  <Ionicons 
                    name="card-outline" 
                    size={20} 
                    color={pricingType === 'paid' ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.pricingTypeText,
                    pricingType === 'paid' && { color: COLORS.primary, fontWeight: '600' },
                  ]}>
                    Pagos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Faixa de Preço - só mostra se não for filtro de gratuitos */}
            {pricingType !== 'free' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faixa de Preço (R$)</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>Mínimo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>Máximo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="500"
                    placeholderTextColor={COLORS.textMuted}
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            )}

            {/* Distância */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distância (km)</Text>
              <View style={styles.optionsGrid}>
                {['5', '10', '21', '42', ''].map((dist) => (
                  <TouchableOpacity
                    key={dist || 'all'}
                    style={[
                      styles.optionChip,
                      selectedDistance === dist && styles.optionChipActive,
                    ]}
                    onPress={() => setSelectedDistance(dist)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedDistance === dist && styles.optionChipTextActive,
                      ]}
                    >
                      {dist ? `${dist}K` : 'Todas'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Organizador */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizador / Empresa</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do organizador ou empresa"
                placeholderTextColor={COLORS.textMuted}
                value={selectedOrganizer}
                onChangeText={setSelectedOrganizer}
              />
              <Text style={styles.helperText}>
                Filtre eventos por assessoria esportiva ou organizador
              </Text>
            </View>

                  <View style={{ height: 100 }} />
                </ScrollView>

                {/* Apply Button */}
                <View style={styles.footer}>
                  <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                    <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clearText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  optionChipTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.textOnPrimary,
  },
  // Estilos para filtro de tipo de inscrição
  pricingTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pricingTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  pricingTypeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pricingTypeOptionFree: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  pricingTypeOptionPaid: {
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    borderColor: COLORS.primary,
  },
  pricingTypeText: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
  },
  pricingTypeTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, RADIUS } from '../constants/theme';
import { useFilters, typeToCategory } from '../contexts/FiltersContext';

interface ActiveFiltersChipsProps {
  onClearAll?: () => void;
}

// Labels das Modalidades Esportivas
// Não confundir com "Categoria" de inscrição (5K, 10K, etc.)
const modalityLabels: Record<string, string> = {
  'corrida': 'Corrida',
  'ultramaratona': 'Ultramaratona',
  'corrida_montanha': 'Corrida de Montanha',
  'trail': 'Trail Run',
  'triathlon': 'Triathlon',
  'duathlon': 'Duathlon',
  'aquathlon': 'Aquathlon',
  'ironman': 'Ironman',
  'ciclismo': 'Ciclismo',
  'mtb': 'MTB',
  'ocr': 'Corrida de Obstáculos',
  'natacao': 'Natação',
  'caminhada': 'Caminhada',
  'outro': 'Outros',
};

const distanceLabels: Record<number, string> = {
  5: '5K',
  10: '10K',
  21: '21K (Meia)',
  42: '42K (Maratona)',
};

export default function ActiveFiltersChips({ onClearAll }: ActiveFiltersChipsProps) {
  const {
    filters,
    hasActiveFilters,
    setSearchText,
    setCategory,
    setTrending,
    setDateRange,
    setLocation,
    setPriceRange,
    setDistance,
    setOrganizer,
    resetFilters,
  } = useFilters();

  if (!hasActiveFilters()) {
    return null;
  }

  const handleClearAll = () => {
    resetFilters();
    onClearAll?.();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const chips: { label: string; onRemove: () => void }[] = [];

  // Busca
  if (filters.searchText) {
    chips.push({
      label: `"${filters.searchText}"`,
      onRemove: () => setSearchText(''),
    });
  }

  // Modalidade Esportiva
  if (filters.category) {
    chips.push({
      label: modalityLabels[filters.category] || filters.category,
      onRemove: () => setCategory(null),
    });
  }

  // Em alta
  if (filters.trending) {
    chips.push({
      label: 'Em Alta',
      onRemove: () => setTrending(false),
    });
  }

  // Data
  if (filters.dateRange) {
    let dateLabel = '';
    if (filters.dateRange.start && filters.dateRange.end) {
      dateLabel = `${formatDate(filters.dateRange.start)} - ${formatDate(filters.dateRange.end)}`;
    } else if (filters.dateRange.start) {
      dateLabel = `A partir de ${formatDate(filters.dateRange.start)}`;
    } else if (filters.dateRange.end) {
      dateLabel = `Até ${formatDate(filters.dateRange.end)}`;
    }
    if (dateLabel) {
      chips.push({
        label: dateLabel,
        onRemove: () => setDateRange(null, null),
      });
    }
  }

  // Localização
  if (filters.location) {
    let locationLabel = '';
    if (filters.location.city && filters.location.state) {
      locationLabel = `${filters.location.city}, ${filters.location.state}`;
    } else if (filters.location.city) {
      locationLabel = filters.location.city;
    } else if (filters.location.state) {
      locationLabel = filters.location.state;
    }
    if (locationLabel) {
      chips.push({
        label: locationLabel,
        onRemove: () => setLocation(null, null),
      });
    }
  }

  // Preço
  if (filters.priceRange) {
    let priceLabel = '';
    if (filters.priceRange.min !== null && filters.priceRange.max !== null) {
      priceLabel = `R$ ${filters.priceRange.min} - R$ ${filters.priceRange.max}`;
    } else if (filters.priceRange.min !== null) {
      priceLabel = `A partir de R$ ${filters.priceRange.min}`;
    } else if (filters.priceRange.max !== null) {
      priceLabel = `Até R$ ${filters.priceRange.max}`;
    }
    if (priceLabel) {
      chips.push({
        label: priceLabel,
        onRemove: () => setPriceRange(null, null),
      });
    }
  }

  // Distância
  if (filters.distance) {
    chips.push({
      label: distanceLabels[filters.distance] || `${filters.distance}K`,
      onRemove: () => setDistance(null),
    });
  }

  // Organizador
  if (filters.organizer) {
    chips.push({
      label: `Org: ${filters.organizer}`,
      onRemove: () => setOrganizer(null),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {chips.map((chip, index) => (
          <View key={index} style={styles.chip}>
            <Text style={styles.chipText}>{chip.label}</Text>
            <TouchableOpacity
              style={styles.chipRemove}
              onPress={chip.onRemove}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Botão Limpar Todos */}
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={14} color={COLORS.error} />
          <Text style={styles.clearAllText}>Limpar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  chipsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.3)',
    gap: SPACING.xs,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  chipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(132, 204, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 4,
    marginLeft: SPACING.xs,
  },
  clearAllText: {
    color: COLORS.error,
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
});

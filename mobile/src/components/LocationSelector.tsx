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

interface LocationSelectorProps {
  currentLocation: string;
  onLocationChange: (location: string) => void;
}

const POPULAR_CITIES = [
  'Vitória, ES',
  'São Paulo, SP',
  'Rio de Janeiro, RJ',
  'Belo Horizonte, MG',
  'Curitiba, PR',
  'Porto Alegre, RS',
  'Salvador, BA',
  'Brasília, DF',
  'Florianópolis, SC',
  'Recife, PE',
  'Fortaleza, CE',
  'Goiânia, GO',
];

export default function LocationSelector({ currentLocation, onLocationChange }: LocationSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredCities = POPULAR_CITIES.filter(city =>
    city.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectCity = (city: string) => {
    onLocationChange(city);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location" size={18} color={COLORS.primary} />
        <Text style={styles.locationText}>{currentLocation}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Selecionar Cidade</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cidade..."
                placeholderTextColor={COLORS.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Current Location */}
            <TouchableOpacity 
              style={styles.currentLocationButton}
              onPress={() => handleSelectCity('Usar minha localização')}
            >
              <View style={styles.currentLocationIcon}>
                <Ionicons name="navigate" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.currentLocationText}>Usar minha localização</Text>
            </TouchableOpacity>

            {/* Cities List */}
            <ScrollView style={styles.citiesList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Cidades Populares</Text>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityItem,
                    currentLocation === city && styles.cityItemActive,
                  ]}
                  onPress={() => handleSelectCity(city)}
                >
                  <Ionicons 
                    name="location-outline" 
                    size={18} 
                    color={currentLocation === city ? COLORS.primary : COLORS.textMuted} 
                  />
                  <Text
                    style={[
                      styles.cityText,
                      currentLocation === city && styles.cityTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                  {currentLocation === city && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: 50 }} />
              </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  locationText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  citiesList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  sectionLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityItemActive: {
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderBottomWidth: 0,
  },
  cityText: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  cityTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

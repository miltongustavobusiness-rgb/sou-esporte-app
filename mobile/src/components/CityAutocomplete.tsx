import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface City {
  name: string;
  state: string;
  fullName: string;
}

interface CityAutocompleteProps {
  value: string;
  onSelect: (city: string, state: string) => void;
  onClear: () => void;
  placeholder?: string;
}

// URL base da API - deve corresponder ao servidor backend atual
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.14:3000';

/**
 * CityAutocomplete - Componente de busca de cidades seguindo padrão de mercado
 * 
 * COMPORTAMENTO ESPERADO (padrão Google/Airbnb):
 * 1. Usuário digita parcialmente → dropdown aparece com sugestões
 * 2. Usuário seleciona cidade → input exibe nome completo (ex: "Vila Velha, ES")
 * 3. Input mantém valor selecionado até usuário limpar manualmente
 * 4. Ao focar novamente, NÃO limpa automaticamente - usuário pode editar ou limpar
 * 
 * CORREÇÃO APLICADA (19/01/2026):
 * - Removido comportamento de limpar input ao focar (handleFocus não reseta mais)
 * - Estado de seleção é mantido corretamente entre interações
 * - Dropdown só reaparece quando usuário digita novamente
 * - Adicionado isSelectingRef para evitar race conditions
 */

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onSelect,
  onClear,
  placeholder = 'Digite o nome da cidade',
}) => {
  // Main input value - shows either search text or selected city
  const [inputValue, setInputValue] = useState(value || '');
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSelection, setHasSelection] = useState(!!value);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  const isSelectingRef = useRef(false); // Flag para evitar race conditions

  // Sincronizar com prop value externa (quando pai atualiza)
  useEffect(() => {
    // Só atualiza se o valor externo mudou E não estamos no meio de uma seleção
    if (!isSelectingRef.current) {
      if (value && value !== inputValue) {
        setInputValue(value);
        setHasSelection(true);
      } else if (!value && inputValue && hasSelection) {
        // Pai limpou o valor
        setInputValue('');
        setHasSelection(false);
      }
    }
  }, [value]);

  const searchCities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setCities([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const input = encodeURIComponent(JSON.stringify({ json: { query: searchQuery, limit: 10 } }));
      const response = await fetch(`${API_URL}/api/trpc/cities.search?input=${input}`);
      const data = await response.json();
      
      if (data.result?.data?.json) {
        setCities(data.result.data.json);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    
    // Se tinha seleção e usuário começou a digitar, limpa o estado de seleção
    if (hasSelection) {
      setHasSelection(false);
    }
    
    // Se usuário limpou o input completamente
    if (text === '') {
      onClear();
      setCities([]);
      setShowDropdown(false);
      return;
    }
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search by 300ms
    debounceRef.current = setTimeout(() => {
      searchCities(text);
    }, 300);
  }, [searchCities, onClear, hasSelection]);

  const handleSelectCity = useCallback((city: City) => {
    // Marcar que estamos selecionando para evitar race condition com useEffect
    isSelectingRef.current = true;
    
    // Definir o nome completo da cidade no input
    const fullCityName = `${city.name}, ${city.state}`;
    setInputValue(fullCityName);
    setHasSelection(true);
    setShowDropdown(false);
    setCities([]);
    Keyboard.dismiss();
    
    // Notificar o pai
    onSelect(city.name, city.state);
    
    // Reset flag após um pequeno delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setHasSelection(false);
    setCities([]);
    setShowDropdown(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  // CORREÇÃO: handleFocus NÃO limpa mais o valor selecionado
  // Usuário pode editar ou limpar manualmente se quiser
  const handleFocus = useCallback(() => {
    // Apenas mostra dropdown se já tiver resultados de busca anterior e não tiver seleção
    if (inputValue.length >= 2 && cities.length > 0 && !hasSelection) {
      setShowDropdown(true);
    }
  }, [inputValue, cities, hasSelection]);

  // NÃO fechar dropdown no blur - deixar aberto até usuário selecionar ou clicar fora
  // O dropdown será fechado quando:
  // 1. Usuário selecionar uma cidade (handleSelectCity)
  // 2. Usuário limpar o input (handleClear ou handleChangeText com texto vazio)
  // 3. Usuário clicar fora do componente (via TouchableWithoutFeedback no pai, se necessário)
  const handleBlur = useCallback(() => {
    // Aumentar delay significativamente para garantir que o clique seja processado
    // Em React Native, o onBlur pode disparar antes do onPress do item
    setTimeout(() => {
      // Só fecha se não estiver selecionando E não tiver cidades para mostrar
      if (!isSelectingRef.current && cities.length === 0) {
        setShowDropdown(false);
      }
    }, 300);
  }, [cities.length]);

  // Render city item
  const renderCityItem = (city: City, index: number) => (
    <TouchableOpacity
      key={`${city.name}-${city.state}-${index}`}
      style={styles.cityItem}
      onPress={() => handleSelectCity(city)}
      activeOpacity={0.7}
    >
      <Ionicons name="location" size={18} color={COLORS.primary} />
      <View style={styles.cityTextContainer}>
        <Text style={styles.cityName}>{city.name}</Text>
        <Text style={styles.cityState}>{city.state}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Input field */}
      <View style={[
        styles.inputContainer, 
        showDropdown && styles.inputContainerActive,
        hasSelection && styles.inputContainerSelected
      ]}>
        <Ionicons 
          name={hasSelection ? "checkmark-circle" : "search"} 
          size={20} 
          color={hasSelection ? COLORS.primary : (showDropdown ? COLORS.primary : COLORS.textSecondary)} 
          style={styles.searchIcon} 
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, hasSelection && styles.inputSelected]}
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        )}
        {(inputValue.length > 0 || hasSelection) && !isLoading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={22} color={hasSelection ? "#EF4444" : COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Dropdown with ScrollView */}
      {showDropdown && cities.length > 0 && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Selecione uma cidade</Text>
          </View>
          <ScrollView 
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {cities.map((city, index) => renderCityItem(city, index))}
          </ScrollView>
        </View>
      )}
      
      {showDropdown && inputValue.length >= 2 && cities.length === 0 && !isLoading && (
        <View style={styles.dropdown}>
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.noResultsText}>Nenhuma cidade encontrada</Text>
            <Text style={styles.noResultsHint}>Tente digitar de outra forma</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  // Input styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputContainerActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputContainerSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#1A2E1A', // Slight green tint to indicate selection
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
  },
  inputSelected: {
    fontWeight: '600',
    color: COLORS.text,
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Dropdown styles
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
    zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownScroll: {
    maxHeight: 230,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  cityTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  cityState: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 8,
  },
  noResultsHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default CityAutocomplete;

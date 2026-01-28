import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS, RADIUS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Filtros disponíveis com configurações de manipulação
// Nota: expo-image-manipulator não suporta filtros de cor avançados nativamente
// Usamos overlays e opacidade para simular os efeitos visualmente
export const FILTERS = [
  { 
    id: 'original', 
    name: 'Original', 
    adjustments: {},
    overlay: 'transparent',
    opacity: 1,
  },
  { 
    id: 'clarendon', 
    name: 'Clarendon', 
    adjustments: { contrast: 1.2, saturation: 1.35, brightness: 1.05 },
    overlay: 'rgba(127, 187, 227, 0.2)',
    opacity: 1,
  },
  { 
    id: 'gingham', 
    name: 'Gingham', 
    adjustments: { brightness: 1.05, saturation: 0.9 },
    overlay: 'rgba(230, 230, 230, 0.15)',
    opacity: 0.95,
  },
  { 
    id: 'moon', 
    name: 'Moon', 
    adjustments: { saturation: 0, contrast: 1.1, brightness: 1.1 },
    overlay: 'rgba(160, 160, 160, 0.3)',
    opacity: 0.9,
    grayscale: true,
  },
  { 
    id: 'lark', 
    name: 'Lark', 
    adjustments: { brightness: 1.08, contrast: 0.9, saturation: 1.15 },
    overlay: 'rgba(242, 242, 242, 0.1)',
    opacity: 1,
  },
  { 
    id: 'reyes', 
    name: 'Reyes', 
    adjustments: { saturation: 0.75, brightness: 1.1, contrast: 0.85 },
    overlay: 'rgba(239, 205, 173, 0.25)',
    opacity: 0.9,
  },
  { 
    id: 'juno', 
    name: 'Juno', 
    adjustments: { saturation: 1.35, contrast: 1.15, brightness: 1.05 },
    overlay: 'rgba(127, 187, 227, 0.1)',
    opacity: 1,
  },
  { 
    id: 'slumber', 
    name: 'Slumber', 
    adjustments: { saturation: 0.66, brightness: 1.05 },
    overlay: 'rgba(125, 105, 24, 0.25)',
    opacity: 0.85,
  },
  { 
    id: 'crema', 
    name: 'Crema', 
    adjustments: { saturation: 0.9, contrast: 0.9, brightness: 1.05 },
    overlay: 'rgba(255, 245, 225, 0.2)',
    opacity: 0.95,
  },
  { 
    id: 'ludwig', 
    name: 'Ludwig', 
    adjustments: { saturation: 0.9, contrast: 1.05, brightness: 1.05 },
    overlay: 'rgba(125, 105, 24, 0.15)',
    opacity: 0.95,
  },
  { 
    id: 'aden', 
    name: 'Aden', 
    adjustments: { saturation: 0.85, brightness: 1.2, contrast: 0.9 },
    overlay: 'rgba(66, 10, 14, 0.15)',
    opacity: 0.9,
  },
  { 
    id: 'perpetua', 
    name: 'Perpetua', 
    adjustments: { saturation: 1.1, brightness: 1.05 },
    overlay: 'rgba(0, 91, 154, 0.15)',
    opacity: 1,
  },
  { 
    id: 'amaro', 
    name: 'Amaro', 
    adjustments: { saturation: 1.5, brightness: 1.1, contrast: 0.9 },
    overlay: 'rgba(125, 105, 24, 0.2)',
    opacity: 0.95,
  },
  { 
    id: 'mayfair', 
    name: 'Mayfair', 
    adjustments: { saturation: 1.1, contrast: 1.1 },
    overlay: 'rgba(255, 200, 200, 0.2)',
    opacity: 1,
  },
  { 
    id: 'rise', 
    name: 'Rise', 
    adjustments: { saturation: 0.9, brightness: 1.05, contrast: 0.9 },
    overlay: 'rgba(236, 205, 169, 0.25)',
    opacity: 0.95,
  },
  { 
    id: 'hudson', 
    name: 'Hudson', 
    adjustments: { brightness: 1.2, contrast: 0.9, saturation: 0.9 },
    overlay: 'rgba(166, 177, 255, 0.25)',
    opacity: 0.9,
  },
  { 
    id: 'valencia', 
    name: 'Valencia', 
    adjustments: { contrast: 1.08, brightness: 1.08, saturation: 1.08 },
    overlay: 'rgba(58, 3, 57, 0.2)',
    opacity: 1,
  },
  { 
    id: 'xpro2', 
    name: 'X-Pro II', 
    adjustments: { contrast: 1.2, saturation: 1.3, brightness: 1.0 },
    overlay: 'rgba(224, 231, 230, 0.2)',
    opacity: 1,
  },
  { 
    id: 'sierra', 
    name: 'Sierra', 
    adjustments: { contrast: 0.85, saturation: 0.9, brightness: 1.1 },
    overlay: 'rgba(128, 78, 15, 0.2)',
    opacity: 0.9,
  },
  { 
    id: 'willow', 
    name: 'Willow', 
    adjustments: { saturation: 0.05, contrast: 0.95, brightness: 1.1 },
    overlay: 'rgba(212, 169, 175, 0.25)',
    opacity: 0.85,
    grayscale: true,
  },
  { 
    id: 'lofi', 
    name: 'Lo-Fi', 
    adjustments: { saturation: 1.1, contrast: 1.5 },
    overlay: 'rgba(34, 34, 34, 0.15)',
    opacity: 1,
  },
  { 
    id: 'inkwell', 
    name: 'Inkwell', 
    adjustments: { saturation: 0, contrast: 1.1, brightness: 1.1 },
    overlay: 'rgba(0, 0, 0, 0)',
    opacity: 1,
    grayscale: true,
  },
  { 
    id: 'hefe', 
    name: 'Hefe', 
    adjustments: { saturation: 1.4, contrast: 1.2, brightness: 1.05 },
    overlay: 'rgba(0, 0, 0, 0.15)',
    opacity: 1,
  },
  { 
    id: 'nashville', 
    name: 'Nashville', 
    adjustments: { saturation: 1.2, contrast: 1.2, brightness: 1.05 },
    overlay: 'rgba(247, 176, 153, 0.25)',
    opacity: 0.95,
  },
];

interface FilterType {
  id: string;
  name: string;
  adjustments: {
    contrast?: number;
    saturation?: number;
    brightness?: number;
  };
  overlay: string;
  opacity: number;
  grayscale?: boolean;
}

interface ImageFilterSelectorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onApplyFilter: (filteredUri: string, filterId: string) => void;
}

export default function ImageFilterSelector({ 
  visible, 
  imageUri, 
  onClose, 
  onApplyFilter 
}: ImageFilterSelectorProps) {
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState(imageUri);

  // Reset quando a imagem muda
  useEffect(() => {
    setPreviewUri(imageUri);
    setSelectedFilter('original');
  }, [imageUri]);

  // Selecionar filtro (apenas visual, não processa ainda)
  const selectFilter = useCallback((filterId: string) => {
    console.log('[ImageFilter] Selecionando filtro:', filterId);
    setSelectedFilter(filterId);
  }, []);

  // Aplicar filtro final e salvar
  const handleApplyFilter = async () => {
    console.log('[ImageFilter] Aplicando filtro:', selectedFilter);
    setProcessing(true);
    
    try {
      const filter = FILTERS.find(f => f.id === selectedFilter) as FilterType | undefined;
      
      if (selectedFilter === 'original' || !filter) {
        console.log('[ImageFilter] Usando imagem original');
        onApplyFilter(imageUri, 'original');
        onClose();
        return;
      }

      // Aplicar manipulações básicas disponíveis
      // Nota: expo-image-manipulator tem suporte limitado para filtros de cor
      // Usamos resize para manter qualidade e o filtro visual é aplicado via overlay
      const actions: ImageManipulator.Action[] = [
        { resize: { width: 1080 } }
      ];
      
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      console.log('[ImageFilter] Imagem processada:', result.uri);
      onApplyFilter(result.uri, selectedFilter);
      onClose();
    } catch (error) {
      console.error('[ImageFilter] Erro ao aplicar filtro:', error);
      // Em caso de erro, usa a imagem original com o filtro selecionado
      onApplyFilter(imageUri, selectedFilter);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  // Obter estilo de opacidade para o filtro
  const getFilterOpacity = (filterId: string): number => {
    const filter = FILTERS.find(f => f.id === filterId) as FilterType | undefined;
    return filter?.opacity || 1;
  };

  // Obter cor do overlay para o filtro
  const getOverlayColor = (filterId: string): string => {
    const filter = FILTERS.find(f => f.id === filterId) as FilterType | undefined;
    return filter?.overlay || 'transparent';
  };

  // Verificar se o filtro é grayscale
  const isGrayscale = (filterId: string): boolean => {
    const filter = FILTERS.find(f => f.id === filterId) as FilterType | undefined;
    return filter?.grayscale || false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filtros</Text>
          <TouchableOpacity 
            onPress={handleApplyFilter} 
            style={styles.headerButton}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.applyText}>Aplicar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview da imagem - WYSIWYG */}
        <View style={styles.previewContainer}>
          {/* Imagem base */}
          <Image 
            source={{ uri: previewUri }} 
            style={[
              styles.previewImage, 
              { opacity: getFilterOpacity(selectedFilter) },
              isGrayscale(selectedFilter) && styles.grayscaleImage
            ]} 
          />
          
          {/* Overlay do filtro */}
          <View 
            style={[
              styles.filterOverlay, 
              { backgroundColor: getOverlayColor(selectedFilter) }
            ]} 
          />
          
          {/* Badge com nome do filtro */}
          <View style={styles.filterNameBadge}>
            <Text style={styles.filterNameText}>
              {FILTERS.find(f => f.id === selectedFilter)?.name || 'Original'}
            </Text>
          </View>

          {/* Indicador de preview */}
          <View style={styles.previewIndicator}>
            <Ionicons name="eye" size={14} color="#fff" />
            <Text style={styles.previewIndicatorText}>Preview</Text>
          </View>
        </View>

        {/* Lista de filtros */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          >
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterItem,
                  selectedFilter === filter.id && styles.filterItemSelected
                ]}
                onPress={() => selectFilter(filter.id)}
                activeOpacity={0.7}
              >
                <View style={styles.filterThumbnailContainer}>
                  {/* Thumbnail com filtro aplicado */}
                  <Image 
                    source={{ uri: imageUri }} 
                    style={[
                      styles.filterThumbnail, 
                      { opacity: filter.opacity || 1 },
                      filter.grayscale && styles.grayscaleImage
                    ]} 
                  />
                  {/* Overlay do filtro no thumbnail */}
                  <View 
                    style={[
                      styles.thumbnailOverlay, 
                      { backgroundColor: filter.overlay || 'transparent' }
                    ]} 
                  />
                  
                  {/* Checkmark para filtro selecionado */}
                  {selectedFilter === filter.id && (
                    <View style={styles.selectedCheckmark}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.filterName,
                  selectedFilter === filter.id && styles.filterNameSelected
                ]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dica de uso */}
        <View style={styles.tipContainer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.tipText}>
            O preview mostra como a imagem ficará após aplicar o filtro
          </Text>
        </View>
      </View>
    </Modal>
  );
}

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImage: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  grayscaleImage: {
    // React Native não suporta CSS filter: grayscale()
    // Usamos tintColor como fallback visual
    tintColor: 'gray',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  filterNameBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  filtersList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  filterItem: {
    alignItems: 'center',
    width: 80,
  },
  filterItemSelected: {
    // Estilo para item selecionado
  },
  filterThumbnailContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  filterThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectedCheckmark: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  filterName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filterNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

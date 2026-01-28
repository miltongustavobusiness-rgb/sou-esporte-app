import React, { useState, useRef } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

// Filtros de vídeo disponíveis (overlay visual)
export const VIDEO_FILTERS = [
  { 
    id: 'original', 
    name: 'Original', 
    overlay: 'transparent'
  },
  { 
    id: 'clarendon', 
    name: 'Clarendon', 
    overlay: 'rgba(127, 187, 227, 0.15)'
  },
  { 
    id: 'gingham', 
    name: 'Gingham', 
    overlay: 'rgba(230, 230, 230, 0.12)'
  },
  { 
    id: 'moon', 
    name: 'Moon', 
    overlay: 'rgba(160, 160, 160, 0.25)',
    grayscale: true
  },
  { 
    id: 'lark', 
    name: 'Lark', 
    overlay: 'rgba(242, 242, 242, 0.08)'
  },
  { 
    id: 'reyes', 
    name: 'Reyes', 
    overlay: 'rgba(239, 205, 173, 0.18)'
  },
  { 
    id: 'juno', 
    name: 'Juno', 
    overlay: 'rgba(127, 187, 227, 0.08)'
  },
  { 
    id: 'slumber', 
    name: 'Slumber', 
    overlay: 'rgba(125, 105, 24, 0.18)'
  },
  { 
    id: 'crema', 
    name: 'Crema', 
    overlay: 'rgba(255, 245, 225, 0.12)'
  },
  { 
    id: 'ludwig', 
    name: 'Ludwig', 
    overlay: 'rgba(125, 105, 24, 0.08)'
  },
  { 
    id: 'aden', 
    name: 'Aden', 
    overlay: 'rgba(66, 10, 14, 0.08)'
  },
  { 
    id: 'perpetua', 
    name: 'Perpetua', 
    overlay: 'rgba(0, 91, 154, 0.08)'
  },
  { 
    id: 'amaro', 
    name: 'Amaro', 
    overlay: 'rgba(125, 105, 24, 0.12)'
  },
  { 
    id: 'mayfair', 
    name: 'Mayfair', 
    overlay: 'rgba(255, 200, 200, 0.12)'
  },
  { 
    id: 'rise', 
    name: 'Rise', 
    overlay: 'rgba(236, 205, 169, 0.18)'
  },
  { 
    id: 'hudson', 
    name: 'Hudson', 
    overlay: 'rgba(166, 177, 255, 0.18)'
  },
  { 
    id: 'valencia', 
    name: 'Valencia', 
    overlay: 'rgba(58, 3, 57, 0.12)'
  },
  { 
    id: 'xpro2', 
    name: 'X-Pro II', 
    overlay: 'rgba(224, 231, 230, 0.12)'
  },
  { 
    id: 'sierra', 
    name: 'Sierra', 
    overlay: 'rgba(128, 78, 15, 0.12)'
  },
  { 
    id: 'willow', 
    name: 'Willow', 
    overlay: 'rgba(212, 169, 175, 0.18)',
    grayscale: true
  },
  { 
    id: 'lofi', 
    name: 'Lo-Fi', 
    overlay: 'rgba(34, 34, 34, 0.08)'
  },
  { 
    id: 'inkwell', 
    name: 'Inkwell', 
    overlay: 'rgba(0, 0, 0, 0)',
    grayscale: true
  },
  { 
    id: 'nashville', 
    name: 'Nashville', 
    overlay: 'rgba(247, 176, 153, 0.18)'
  },
];

interface VideoFilterSelectorProps {
  visible: boolean;
  videoUri: string;
  thumbnailUri?: string;
  onClose: () => void;
  onApplyFilter: (filterId: string) => void;
}

export default function VideoFilterSelector({ 
  visible, 
  videoUri, 
  thumbnailUri,
  onClose, 
  onApplyFilter 
}: VideoFilterSelectorProps) {
  const [selectedFilter, setSelectedFilter] = useState('original');
  const videoRef = useRef<Video>(null);

  const handleApplyFilter = () => {
    onApplyFilter(selectedFilter);
    onClose();
  };

  const getFilterOverlay = (filterId: string) => {
    const filter = VIDEO_FILTERS.find(f => f.id === filterId);
    return filter?.overlay || 'transparent';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filtros de Vídeo</Text>
          <TouchableOpacity 
            onPress={handleApplyFilter} 
            style={styles.headerButton}
          >
            <Text style={styles.applyText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        {/* Preview do vídeo */}
        <View style={styles.previewContainer}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.previewVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay={true}
            isMuted={true}
            isLooping={true}
          />
          <View style={[styles.filterOverlay, { backgroundColor: getFilterOverlay(selectedFilter) }]} />
          
          {/* Nome do filtro selecionado */}
          <View style={styles.filterNameBadge}>
            <Text style={styles.filterNameText}>
              {VIDEO_FILTERS.find(f => f.id === selectedFilter)?.name || 'Original'}
            </Text>
          </View>
        </View>

        {/* Lista de filtros */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          >
            {VIDEO_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterItem,
                  selectedFilter === filter.id && styles.filterItemSelected
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <View style={styles.filterThumbnailContainer}>
                  {thumbnailUri ? (
                    <Image 
                      source={{ uri: thumbnailUri }} 
                      style={styles.filterThumbnail} 
                    />
                  ) : (
                    <View style={[styles.filterThumbnail, { backgroundColor: COLORS.card }]}>
                      <Ionicons name="videocam" size={24} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={[styles.thumbnailOverlay, { backgroundColor: filter.overlay }]} />
                  {selectedFilter === filter.id && (
                    <View style={styles.selectedIndicator}>
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

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            O filtro será aplicado como overlay no vídeo
          </Text>
        </View>

        {/* Botões de ação */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.applyButton} 
            onPress={handleApplyFilter}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
            <Text style={styles.applyButtonText}>Aplicar Filtro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerButton: {
    padding: 8,
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },
  previewVideo: {
    width: width,
    height: width * (16/9),
    maxHeight: '100%',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterNameBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  filtersList: {
    paddingHorizontal: 12,
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    opacity: 0.7,
  },
  filterItemSelected: {
    opacity: 1,
  },
  filterThumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  filterName: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  filterNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

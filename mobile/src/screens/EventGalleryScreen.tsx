import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Modal,
  Dimensions,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { api, EventPhoto } from '../services/api';

import { useToast } from '../contexts/ToastContext';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 2) / 3;

type EventGalleryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EventGallery'>;
  route: RouteProp<RootStackParamList, 'EventGallery'>;
};

interface Photo {
  id: number;
  uri: string;
  thumbnail: string;
  photographer?: string;
  timestamp?: string;
}

export default function EventGalleryScreen({ navigation, route }: EventGalleryScreenProps) {
  const { showToast } = useToast();
  const eventId = route.params?.eventId;
  const eventName = route.params?.eventName || 'Evento';
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [photographers, setPhotographers] = useState<string[]>([]);

  const loadPhotos = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    
    try {
      const eventPhotos = await api.getEventPhotos(eventId);
      
      const formattedPhotos: Photo[] = eventPhotos.map(p => ({
        id: p.id,
        uri: p.url,
        thumbnail: p.thumbnailUrl || p.url,
        photographer: p.photographer || undefined,
        timestamp: p.createdAt,
      }));
      
      setPhotos(formattedPhotos);
      
      // Get unique photographers
      const uniquePhotographers = [...new Set(eventPhotos.filter(p => p.photographer).map(p => p.photographer!))] as string[];
      setPhotographers(uniquePhotographers);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleDownload = async () => {
    if (!selectedPhoto) return;
    
    setIsDownloading(true);
    try {
      // In a real app, this would download the image to the device
      showToast('A foto será baixada em breve.', 'info');
    } catch (error) {
      showToast('Não foi possível baixar a foto.', 'info');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedPhoto) return;
    
    try {
      await Share.share({
        message: `Confira essa foto da ${eventName}! 🏃‍♂️ #SouEsporte`,
        url: selectedPhoto.uri,
      });
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const renderPhotoItem = (photo: Photo, index: number) => (
    <TouchableOpacity
      key={photo.id}
      style={styles.photoItem}
      onPress={() => handlePhotoPress(photo)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.thumbnail }}
        style={styles.thumbnail}
        onLoadStart={() => setLoadingImages(prev => ({ ...prev, [photo.id]: true }))}
        onLoadEnd={() => setLoadingImages(prev => ({ ...prev, [photo.id]: false }))}
      />
      {loadingImages[photo.id] && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando fotos...</Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Galeria de Fotos</Text>
          <Text style={styles.headerSubtitle}>{eventName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="images-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>{photos.length} fotos</Text>
        </View>
        {photographers.length > 0 && (
          <View style={styles.infoItem}>
            <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>{photographers.length} fotógrafos</Text>
          </View>
        )}
      </View>

      {/* Grid de Fotos */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {photos.length > 0 ? (
          <>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => renderPhotoItem(photo, index))}
            </View>

            {/* Créditos */}
            {photographers.length > 0 && (
              <View style={styles.creditsContainer}>
                <Text style={styles.creditsTitle}>Fotógrafos Oficiais</Text>
                <Text style={styles.creditsText}>
                  {photographers.join(' • ')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma foto disponível</Text>
            <Text style={styles.emptyText}>
              As fotos do evento serão publicadas em breve.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Visualização */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedPhoto(null)}
            >
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Ionicons name="download-outline" size={24} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalImageContainer}>
            {selectedPhoto && (
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {selectedPhoto?.photographer && (
            <View style={styles.modalFooter}>
              <Ionicons name="camera" size={16} color={COLORS.textMuted} />
              <Text style={styles.photographerText}>
                Foto por {selectedPhoto.photographer}
              </Text>
            </View>
          )}
        </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: SIZES.body5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
  },
  creditsTitle: {
    fontSize: SIZES.body3,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  creditsText: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  photographerText: {
    fontSize: SIZES.body4,
    color: COLORS.textMuted,
  },
});

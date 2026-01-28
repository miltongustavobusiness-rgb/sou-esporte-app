import React, { memo } from 'react';
import {
  TouchableOpacity,
  Image,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * GridItem - Componente unificado para thumbnails em grids
 * 
 * Este componente centraliza a lógica de navegação para posts/vídeos
 * garantindo comportamento consistente em todas as telas do app:
 * - Home Feed Grid
 * - Meu Perfil Grid
 * - Perfil de Outros Usuários
 * - Posts Salvos
 * - Perfil de Atleta
 * - Busca
 * 
 * Comportamento:
 * - Clique em IMAGEM/TEXTO → PostDetail
 * - Clique em VÍDEO → VideoPlayer (fullscreen + autoplay)
 */

export interface GridItemProps {
  /** ID único do post */
  id: number;
  /** URL da thumbnail (imagem ou frame do vídeo) */
  thumbnailUrl?: string | null;
  /** URL da mídia principal (fallback para thumbnail) */
  mediaUrl?: string | null;
  /** Tipo de mídia: 'image' ou 'video' */
  mediaType?: 'image' | 'video' | string | null;
  /** URL do vídeo (se existir, considera como vídeo) */
  videoUrl?: string | null;
  /** Conteúdo de texto (para posts sem mídia) */
  content?: string | null;
  /** Tamanho do item (padrão: 1/3 da tela) */
  size?: number;
  /** Gap entre itens */
  gap?: number;
  /** Número de colunas no grid */
  columns?: number;
  /** Origem da navegação (para logging) */
  source?: string;
  /** Callback opcional após navegação */
  onPress?: () => void;
  /** Mostrar contador de likes */
  likesCount?: number;
  /** Mostrar contador de comentários */
  commentsCount?: number;
}

function GridItemComponent({
  id,
  thumbnailUrl,
  mediaUrl,
  mediaType,
  videoUrl,
  content,
  size,
  gap = 2,
  columns = 3,
  source = 'unknown',
  onPress,
  likesCount,
  commentsCount,
}: GridItemProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Calcular tamanho do item baseado nas colunas
  const itemSize = size || (SCREEN_WIDTH - (gap * (columns + 1))) / columns;

  // Determinar se é vídeo
  const isVideo = mediaType === 'video' || !!videoUrl;

  // URL da imagem a exibir
  const imageUri = thumbnailUrl || mediaUrl || videoUrl;

  /**
   * Handler de clique - Navegação DIRETA para post específico
   * NÃO passa pelo Feed, NÃO faz scroll, abre tela dedicada
   */
  const handlePress = () => {
    // Log para debug
    console.log(`[GridItem] ====== PRESSED ======`);
    console.log(`[GridItem] Source: ${source}`);
    console.log(`[GridItem] Post ID: ${id}`);
    console.log(`[GridItem] Is Video: ${isVideo}`);
    console.log(`[GridItem] MediaType: ${mediaType}`);
    console.log(`[GridItem] Has VideoUrl: ${!!videoUrl}`);

    // Validar ID
    if (!id) {
      console.error('[GridItem] ERROR: Invalid postId');
      return;
    }

    // Callback opcional
    if (onPress) {
      onPress();
    }

    // NAVEGAÇÃO DIRETA baseada no tipo de mídia
    if (isVideo) {
      // VÍDEO → VideoPlayer (fullscreen + autoplay)
      console.log(`[GridItem] >>> Navigating to VideoPlayer: ${id}`);
      navigation.navigate('VideoPlayer', { 
        postId: id, 
        autoplay: true, 
        fullscreen: true 
      });
    } else {
      // IMAGEM/TEXTO → PostDetail
      console.log(`[GridItem] >>> Navigating to PostDetail: ${id}`);
      navigation.navigate('PostDetail', { postId: id });
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { width: itemSize, height: itemSize, margin: gap / 2 }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.textPlaceholder]}>
          <Text style={styles.textContent} numberOfLines={4}>
            {content || ''}
          </Text>
        </View>
      )}

      {/* Indicador de vídeo */}
      {isVideo && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      )}

      {/* Stats overlay (opcional) */}
      {(likesCount !== undefined || commentsCount !== undefined) && (
        <View style={styles.statsOverlay}>
          {likesCount !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="heart" size={12} color="#fff" />
              <Text style={styles.statText}>{likesCount}</Text>
            </View>
          )}
          {commentsCount !== undefined && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={12} color="#fff" />
              <Text style={styles.statText}>{commentsCount}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: COLORS.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textPlaceholder: {
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  textContent: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});

// Memoizar para evitar re-renders desnecessários
export const GridItem = memo(GridItemComponent);

export default GridItem;

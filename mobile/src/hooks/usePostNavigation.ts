import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useToast } from '../contexts/ToastContext';

/**
 * Hook unificado para navegação de posts em grids
 * 
 * Comportamento:
 * - Imagem/Texto → PostDetail
 * - Vídeo → VideoPlayer (fullscreen + autoplay)
 * 
 * Uso:
 * const { openPost } = usePostNavigation();
 * <TouchableOpacity onPress={() => openPost(post)}>
 */

interface PostData {
  id: number;
  mediaType?: 'image' | 'video' | string;
  videoUrl?: string | null;
}

export function usePostNavigation() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();

  /**
   * Navega para o post específico baseado no tipo de mídia
   * @param post - Objeto do post com id, mediaType e videoUrl
   * @param source - Origem da navegação (para logging)
   */
  const openPost = useCallback((post: PostData, source: string = 'unknown') => {
    // Log para debug
    console.log(`[usePostNavigation] ====== POST PRESSED ======`);
    console.log(`[usePostNavigation] Source: ${source}`);
    console.log(`[usePostNavigation] Post:`, JSON.stringify({
      id: post.id,
      mediaType: post.mediaType,
      hasVideoUrl: !!post.videoUrl,
    }));

    // Validar ID
    if (!post.id) {
      console.error('[usePostNavigation] ERROR: Invalid postId');
      showToast('Post não disponível', 'error');
      return;
    }

    // Determinar se é vídeo
    const isVideo = post.mediaType === 'video' || !!post.videoUrl;

    if (isVideo) {
      // VÍDEO → VideoPlayer (fullscreen + autoplay)
      console.log(`[usePostNavigation] >>> Navigating to VideoPlayer: ${post.id}`);
      navigation.navigate('VideoPlayer', { 
        postId: post.id, 
        autoplay: true, 
        fullscreen: true 
      });
    } else {
      // IMAGEM/TEXTO → PostDetail
      console.log(`[usePostNavigation] >>> Navigating to PostDetail: ${post.id}`);
      navigation.navigate('PostDetail', { postId: post.id });
    }
  }, [navigation, showToast]);

  /**
   * Navega diretamente para PostDetail (sem verificar tipo)
   */
  const openPostDetail = useCallback((postId: number, source: string = 'unknown') => {
    console.log(`[usePostNavigation] openPostDetail - Source: ${source}, PostId: ${postId}`);
    
    if (!postId) {
      showToast('Post não disponível', 'error');
      return;
    }

    navigation.navigate('PostDetail', { postId });
  }, [navigation, showToast]);

  /**
   * Navega diretamente para VideoPlayer
   */
  const openVideoPlayer = useCallback((postId: number, source: string = 'unknown') => {
    console.log(`[usePostNavigation] openVideoPlayer - Source: ${source}, PostId: ${postId}`);
    
    if (!postId) {
      showToast('Vídeo não disponível', 'error');
      return;
    }

    navigation.navigate('VideoPlayer', { 
      postId, 
      autoplay: true, 
      fullscreen: true 
    });
  }, [navigation, showToast]);

  return {
    openPost,
    openPostDetail,
    openVideoPlayer,
  };
}

export default usePostNavigation;

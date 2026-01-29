import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type VideoPlayerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VideoPlayer'>;
  route: RouteProp<RootStackParamList, 'VideoPlayer'>;
};

interface VideoData {
  id: number;
  videoUrl: string;
  videoThumbnailUrl?: string;
  content?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export default function VideoPlayerScreen({ navigation, route }: VideoPlayerScreenProps) {
  const { postId, autoplay = true, fullscreen = true } = route.params;
  const { showToast } = useToast();
  
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Log de debug
  useEffect(() => {
    console.log('[VideoPlayerScreen] Mounted with params:', { postId, autoplay, fullscreen });
  }, []);

  // Buscar dados do vídeo
  const fetchVideoData = useCallback(async () => {
    if (!postId || typeof postId !== 'number') {
      console.error('[VideoPlayerScreen] Invalid postId:', postId);
      setError('ID do vídeo inválido');
      setLoading(false);
      return;
    }

    console.log('[VideoPlayerScreen] Fetching video data for postId:', postId);
    
    try {
      const data = await api.getPostDetail(postId);
      
      if (!data) {
        console.warn('[VideoPlayerScreen] Video not found:', postId);
        setError('Vídeo não encontrado');
        setVideoData(null);
      } else if (!data.videoUrl) {
        console.warn('[VideoPlayerScreen] Post is not a video:', postId);
        setError('Este post não é um vídeo');
        setVideoData(null);
      } else {
        console.log('[VideoPlayerScreen] Video data loaded:', { 
          id: data.id, 
          hasVideoUrl: !!data.videoUrl 
        });
        setVideoData({
          id: data.id,
          videoUrl: data.videoUrl,
          videoThumbnailUrl: data.videoThumbnailUrl || undefined,
          content: data.content || undefined,
          authorName: data.author?.name || 'Usuário',
          authorPhotoUrl: data.author?.photoUrl || undefined,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          isLiked: data.isLiked || false,
        });
        setIsLiked(data.isLiked || false);
        setLikesCount(data.likesCount || 0);
      }
    } catch (err: any) {
      console.error('[VideoPlayerScreen] Error fetching video:', err);
      setError('Erro ao carregar vídeo');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);

  // Video player - inicializa quando temos videoUrl
  const player = useVideoPlayer(videoData?.videoUrl || '', (player) => {
    player.loop = true;
    player.muted = false; // Autoplay com som
    if (autoplay) {
      player.play();
    }
  });

  // Atualizar mute state
  // CRITICAL: Ensure boolean, not string
  useEffect(() => {
    if (player) {
      player.muted = Boolean(isMuted);
    }
  }, [isMuted, player]);

  // Hide status bar em fullscreen
  useFocusEffect(
    useCallback(() => {
      if (fullscreen) {
        StatusBar.setHidden(true);
      }
      return () => {
        StatusBar.setHidden(false);
      };
    }, [fullscreen])
  );

  // Handle back button no Android
  // IMPORTANTE: Usar backHandler.remove() em vez de BackHandler.removeEventListener
  // A API antiga foi depreciada e causa erro: "removeEventListener is not a function"
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      // Armazenar referência retornada pelo addEventListener
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // No cleanup, usar backHandler.remove() (nova API)
      return () => backHandler.remove();
    }, [navigation])
  );

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleScreenTap = () => {
    resetControlsTimeout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const handleLike = async () => {
    if (!videoData) return;
    
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (wasLiked) {
        await api.unlikePost(videoData.id);
      } else {
        await api.likePost(videoData.id);
      }
    } catch (error) {
      // Rollback
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
    resetControlsTimeout();
  };

  const handleComment = () => {
    if (!videoData) return;
    navigation.navigate('Comments' as any, { postId: videoData.id });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando vídeo...</Text>
      </View>
    );
  }

  // Error state
  if (error || !videoData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="videocam-off-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorTitle}>Vídeo não disponível</Text>
        <Text style={styles.errorText}>
          {error || 'O vídeo pode ter sido removido ou você não tem permissão para visualizá-lo.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleClose}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1}
      onPress={handleScreenTap}
    >
      {/* Video Player - Full Screen */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Overlay Controls */}
      {showControls && (
        <>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Mute Button */}
          <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
            <Ionicons 
              name={isMuted ? 'volume-mute' : 'volume-high'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>

          {/* Right Side Actions */}
          <View style={styles.rightActions}>
            {/* Like */}
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons 
                name={isLiked ? 'heart' : 'heart-outline'} 
                size={28} 
                color={isLiked ? '#ef4444' : '#fff'} 
              />
              <Text style={styles.actionText}>{likesCount}</Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
              <Ionicons name="chatbubble-outline" size={26} color="#fff" />
              <Text style={styles.actionText}>{videoData.commentsCount}</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Info */}
          <View style={styles.bottomInfo}>
            <Text style={styles.authorName}>{videoData.authorName}</Text>
            {videoData.content && (
              <Text style={styles.caption} numberOfLines={2}>
                {videoData.content}
              </Text>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  muteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: Platform.OS === 'ios' ? 40 : 20,
  },
  authorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

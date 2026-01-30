import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { useVideoPlayer, VideoView } from 'expo-video';
import { toBool } from '../utils/bool';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PostDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PostDetail'>;
  route: RouteProp<RootStackParamList, 'PostDetail'>;
};

interface PostData {
  id: number;
  content: string | null;
  type: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  videoAspectMode?: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
  author: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
}

export default function PostDetailScreen({ navigation, route }: PostDetailScreenProps) {
  // Validação inicial dos parâmetros
  const postId = route.params?.postId;
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log inicial para debug
  useEffect(() => {
    console.log('[PostDetailScreen] Mounted with params:', { 
      postId, 
      routeParams: route.params,
      source: 'PostDetailScreen'
    });
  }, []);

  // Video player setup - só inicializa se tiver videoUrl
  const player = useVideoPlayer(post?.videoUrl || '', (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const fetchPost = useCallback(async () => {
    // Validação de postId
    if (!postId || typeof postId !== 'number' || postId <= 0) {
      console.error('[PostDetailScreen] Invalid postId:', postId);
      setError('ID do post inválido');
      setLoading(false);
      return;
    }

    console.log('[PostDetailScreen] Fetching post:', postId);
    setError(null);
    
    try {
      const data = await api.getPostDetail(postId);
      
      console.log('[PostDetailScreen] API response:', { 
        hasData: !!data, 
        postId: data?.id,
        hasAuthor: !!data?.author,
        type: data?.type
      });
      
      if (!data) {
        console.warn('[PostDetailScreen] Post not found:', postId);
        setError('Post não encontrado');
        setPost(null);
      } else {
        setPost(data);
        setIsLiked(data.isLiked || false);
        setIsSaved(data.isSaved || false);
        setLikesCount(data.likesCount || 0);
      }
    } catch (err: any) {
      console.error('[PostDetailScreen] Error fetching post:', {
        postId,
        error: err?.message || err,
        stack: err?.stack
      });
      
      // Mensagem de erro amigável baseada no tipo de erro
      if (err?.message?.includes('404') || err?.message?.includes('not found')) {
        setError('Este post não está mais disponível');
      } else if (err?.message?.includes('network') || err?.message?.includes('Network')) {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError('Erro ao carregar post');
      }
      
      showToast('Erro ao carregar post', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, showToast]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    // Update player muted state
    if (player) {
      player.muted = toBool(isMuted);
    }
  }, [isMuted, player]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPost();
  }, [fetchPost]);

  const handleLikeToggle = async () => {
    if (likeLoading || !postId) return;
    
    setLikeLoading(true);
    const wasLiked = isLiked;
    
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (wasLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      showToast('Erro ao atualizar', 'error');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (saveLoading || !postId) return;
    
    setSaveLoading(true);
    const wasSaved = isSaved;
    
    // Optimistic update
    setIsSaved(!wasSaved);
    
    try {
      if (wasSaved) {
        await api.unsavePost(postId);
        showToast('Removido dos salvos', 'success');
      } else {
        await api.savePost(postId);
        showToast('Salvo!', 'success');
      }
    } catch (error) {
      // Rollback on error
      setIsSaved(wasSaved);
      showToast('Erro ao atualizar', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async () => {
    if (!postId) return;
    
    try {
      await Share.share({
        message: `Confira este post no Sou Esporte!`,
        url: `https://souesporte.com/post/${postId}`,
      });
      await api.sharePost(postId);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleComments = () => {
    if (!postId) return;
    navigation.navigate('Comments' as any, { postId });
  };

  const navigateToProfile = () => {
    if (!post?.author?.id) return;
    
    if (post.author.id === user?.id) {
      navigation.navigate('MyGrid' as any);
    } else {
      navigation.navigate('UserGrid' as any, { 
        userId: post.author.id, 
        userName: post.author.name 
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando post...</Text>
      </View>
    );
  }

  // Error state ou post não encontrado
  if (error || !post) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorTitle}>Post não disponível</Text>
        <Text style={styles.errorText}>
          {error || 'O post pode ter sido removido ou você não tem permissão para visualizá-lo.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setLoading(true);
            setError(null);
            fetchPost();
          }}
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const authorAvatarUrl = post.author?.photoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=a3e635&color=0a0a0a`;

  const isVideo = post.type === 'video' && post.videoUrl;
  const mediaAspectRatio = post.videoAspectMode === 'portrait' ? 9/16 : 
                           post.videoAspectMode === 'square' ? 1 : 
                           post.videoAspectMode === 'landscape' ? 16/9 : 16/9;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Post</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Author Info */}
        <TouchableOpacity style={styles.authorSection} onPress={navigateToProfile}>
          <Image source={{ uri: authorAvatarUrl }} style={styles.authorAvatar} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author?.name || 'Usuário'}</Text>
            <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Media Content */}
        {isVideo ? (
          <View style={[styles.mediaContainer, { aspectRatio: mediaAspectRatio }]}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
            <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
              <Ionicons 
                name={isMuted ? 'volume-mute' : 'volume-high'} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        ) : post.imageUrl ? (
          <Image 
            source={{ uri: post.imageUrl }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleLikeToggle}
              disabled={likeLoading}
            >
              <Ionicons 
                name={isLiked ? 'heart' : 'heart-outline'} 
                size={26} 
                color={isLiked ? '#ef4444' : COLORS.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleComments}>
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSaveToggle}
            disabled={saveLoading}
          >
            <Ionicons 
              name={isSaved ? 'bookmark' : 'bookmark-outline'} 
              size={24} 
              color={COLORS.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Likes Count */}
        <View style={styles.likesSection}>
          <Text style={styles.likesCount}>{likesCount} curtidas</Text>
        </View>

        {/* Caption */}
        {post.content && (
          <View style={styles.captionSection}>
            <Text style={styles.captionText}>
              <Text style={styles.captionAuthor}>{post.author?.name || 'Usuário'}</Text>
              {'  '}
              {post.content}
            </Text>
          </View>
        )}

        {/* Comments Link */}
        {(post.commentsCount || 0) > 0 && (
          <TouchableOpacity style={styles.commentsLink} onPress={handleComments}>
            <Text style={styles.commentsLinkText}>
              Ver todos os {post.commentsCount} comentários
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  authorInfo: {
    marginLeft: SPACING.sm,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.card,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: COLORS.card,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  likesSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: 4,
  },
  likesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  captionSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  captionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  captionAuthor: {
    fontWeight: '600',
  },
  commentsLink: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  commentsLinkText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  bottomPadding: {
    height: 40,
  },
});

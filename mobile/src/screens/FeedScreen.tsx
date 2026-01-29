import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  Dimensions,
  FlatList,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ViewToken,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { RootStackParamList } from '../types';
import { COLORS, SIZES, RADIUS, SPACING } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import BottomNavigation from '../components/BottomNavigation';
import {
  getUpcomingTrainings,
  formatRelativeTime,
  formatTrainingDate,
  formatTime,
} from '../data/mockData';
import { useFeed } from '../hooks/useFeed';
import PostOptionsModal from '../components/PostOptionsModal';
import ShareModal from '../components/ShareModal';
import ReportModal from '../components/ReportModal';
import CommentsBottomSheet from '../components/CommentsBottomSheet';
import VideoFullscreenModal from '../components/VideoFullscreenModal';
import { FeedAudioController } from '../utils/FeedAudioController';
import LikesModal from '../components/LikesModal';
import api from '../services/api';
import GridItem from '../components/GridItem';
import LinkifiedText from '../components/LinkifiedText';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

// Quick Actions para navegação - Ordem conforme solicitação do usuário
const QUICK_ACTIONS = [
  { id: 'meus-grupos', icon: 'people', label: 'Meus Grupos', screen: 'MyGroups', color: '#22c55e' },
  { id: 'treinar', icon: 'fitness', label: 'Treinar', screen: 'TrainHub', color: '#3b82f6' },
  { id: 'competicoes', icon: 'trophy', label: 'Competições', screen: 'AthleteHome', color: '#fbbf24' },
  { id: 'agenda', icon: 'calendar', label: 'Agenda', screen: 'Agenda', color: '#f97316' },
  { id: 'gps', icon: 'navigate', label: 'GPS', screen: 'GPS', color: '#a855f7' },
];

// Mapeamento de tipos de treino para ícones e cores
const TRAINING_TYPE_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  easy_run: { icon: 'walk', color: '#22c55e', label: 'Corrida Leve' },
  speed_work: { icon: 'flash', color: '#f59e0b', label: 'Velocidade' },
  endurance: { icon: 'bicycle', color: '#3b82f6', label: 'Resistência' },
  trail: { icon: 'leaf', color: '#84cc16', label: 'Trail' },
  swimming: { icon: 'water', color: '#06b6d4', label: 'Natação' },
  brick: { icon: 'fitness', color: '#8b5cf6', label: 'Brick' },
  default: { icon: 'fitness', color: '#a3e635', label: 'Treino' },
};

// Interface para lista de vídeos
interface VideoItemData {
  id: number;
  videoUrl: string;
  thumbnailUrl?: string;
  authorName?: string;
  content?: string;
}

// Video Player Component for inline video playback - Instagram style
// Uses expo-video with synchronous API for immediate audio control
// Uses FeedAudioController for unified audio state machine
const InlineVideoPlayer = ({ 
  videoUrl, 
  thumbnailUrl, 
  aspectMode: initialAspectMode = 'fill', // Padrão: zoom para preencher (estilo Reels) 
  isHorizontal = false,
  videos = [],
  currentVideoId,
  isActive = false, // Whether this video is currently in focus
  onMuteToggle, // Callback to toggle global audio state
  globalAudioEnabled = false, // Global audio state from parent
  onEnterFullscreen, // Callback when entering fullscreen
}: { 
  videoUrl: string; 
  thumbnailUrl?: string; 
  aspectMode?: 'fit' | 'fill'; 
  isHorizontal?: boolean;
  videos?: VideoItemData[];
  currentVideoId?: number;
  isActive?: boolean;
  onMuteToggle?: () => void;
  globalAudioEnabled?: boolean;
  onEnterFullscreen?: (videoId: string) => void;
}) => {
  const [isPaused, setIsPaused] = useState(false); // Controla se foi pausado manualmente
  const [progress, setProgress] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  // Unique player ID for audio controller - stable ID based on currentVideoId
  const playerId = useMemo(() => `inline-${currentVideoId || 0}`, [currentVideoId]);

  // Create video player using expo-video hook
  // This is the KEY CHANGE - expo-video has synchronous API
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true; // Start muted
    p.volume = 0; // Ensure volume is 0
    // Set audio mixing mode to allow audio playback
    // 'auto' allows other apps to play when muted, interrupts when unmuted
    if ('audioMixingMode' in p) {
      (p as any).audioMixingMode = 'auto';
    }
    p.play(); // Autoplay
    
    // Log video URL for debugging
    console.log(`[InlineVideoPlayer] 🎥 Loading video: ${videoUrl}`);
  });
  
  // Listen for playback status updates and errors
  useEffect(() => {
    if (!player) return;
    
    // Listen for status changes
    const statusSubscription = player.addListener('statusChange', (status) => {
      console.log(`[InlineVideoPlayer] 📊 Status: ${status.status}`);
      if (status.status === 'error') {
        console.error(`[InlineVideoPlayer] ❌ VIDEO ERROR:`, {
          url: videoUrl,
          error: status.error,
          message: (status as any).error?.message || 'Unknown error'
        });
        // Check for specific error types
        const errorMsg = String((status as any).error?.message || '');
        if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          console.error('[InlineVideoPlayer] 🚫 403 Forbidden - Check CORS or authentication');
        } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          console.error('[InlineVideoPlayer] 🔍 404 Not Found - Video URL may be invalid');
        } else if (errorMsg.includes('decode') || errorMsg.includes('codec')) {
          console.error('[InlineVideoPlayer] 🎦 Decode Error - Video format may be incompatible');
        } else if (errorMsg.includes('network') || errorMsg.includes('Network')) {
          console.error('[InlineVideoPlayer] 🌐 Network Error - Check connection and server');
        }
      } else if (status.status === 'readyToPlay') {
        console.log(`[InlineVideoPlayer] ✅ Video ready to play: ${videoUrl}`);
      }
    });
    
    return () => {
      statusSubscription.remove();
    };
  }, [player, videoUrl]);

  // Track playing state using expo event hook
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Register player with audio controller when created
  useEffect(() => {
    if (player) {
      FeedAudioController.registerInlinePlayer(playerId, player);
      console.log(`[InlineVideoPlayer] Registered: ${playerId}`);
    }
    return () => {
      FeedAudioController.unregisterInlinePlayer(playerId);
      console.log(`[InlineVideoPlayer] Unregistered: ${playerId}`);
    };
  }, [player, playerId]);

  // Apply audio state when isActive or globalAudioEnabled changes
  // SYNCHRONOUS - This is the key advantage of expo-video
  useEffect(() => {
    if (player) {
      const shouldHaveAudio = globalAudioEnabled && isActive;
      console.log(`[InlineVideoPlayer] ${playerId} - useEffect applying audio: shouldHaveAudio=${shouldHaveAudio}, globalAudioEnabled=${globalAudioEnabled}, isActive=${isActive}`);
      
      // SYNCHRONOUS API - No race conditions!
      // Apply muted state
      player.muted = !shouldHaveAudio;
      
      // Apply volume - IMPORTANT: volume is separate from muted
      // Even if muted=false, volume=0 means no sound
      player.volume = shouldHaveAudio ? 1 : 0;
      
      // Log the actual player state after setting
      console.log(`[InlineVideoPlayer] ${playerId} - After setting: player.muted=${player.muted}, player.volume=${player.volume}`);
      
      // Ensure video is playing if active and not paused
      if (isActive && !isPaused && !player.playing) {
        player.play();
      }
    }
  }, [player, globalAudioEnabled, isActive, isPaused, playerId]);

  // Track progress using time update events
  useEffect(() => {
    if (!player) return;
    
    // Set up time update interval
    player.timeUpdateEventInterval = 0.5; // Update every 500ms
    
    const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) {
        setProgress(currentTime / player.duration);
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [player]);

  // Tocar/Pausar ao tocar no vídeo
  const handleVideoPress = useCallback(() => {
    if (player) {
      if (player.playing) {
        player.pause();
        setIsPaused(true);
      } else {
        player.play();
        setIsPaused(false);
      }
    }
  }, [player]);

  // Toggle global audio state - Instagram style
  // When user taps speaker, it enables audio for THIS video immediately
  const handleMuteToggle = useCallback(() => {
    console.log(`[InlineVideoPlayer] ${playerId} - Mute toggle pressed, isActive: ${isActive}`);
    
    // First, ensure this video is set as the active inline video
    if (isActive) {
      FeedAudioController.setInlineFocus(playerId);
    }
    
    // Toggle audio through the controller - this will apply to the active video
    const newAudioState = FeedAudioController.toggleAudio();
    console.log(`[InlineVideoPlayer] ${playerId} - New audio state: ${newAudioState}`);
    
    // ALSO directly apply to this player for IMMEDIATE effect
    // The controller will handle the state, but we want instant feedback
    if (player && isActive) {
      console.log(`[InlineVideoPlayer] ${playerId} - Applying audio directly: muted=${!newAudioState}, volume=${newAudioState ? 1 : 0}`);
      player.muted = !newAudioState;
      player.volume = newAudioState ? 1 : 0;
      
      // Force play if not playing
      if (!player.playing) {
        player.play();
      }
    }
    
    // Notify parent about the toggle (for UI update)
    if (onMuteToggle) {
      onMuteToggle();
    }
  }, [player, onMuteToggle, isActive, playerId]);

  // Handle entering fullscreen
  const handleEnterFullscreen = useCallback(() => {
    // Notify parent about fullscreen entry
    if (onEnterFullscreen) {
      onEnterFullscreen(playerId);
    }
    
    // Pause and mute this inline player
    if (player) {
      player.pause();
      player.muted = true;
    }
    setIsPaused(true);
    setShowFullscreen(true);
  }, [player, onEnterFullscreen, playerId]);

  // Handle exiting fullscreen
  const handleExitFullscreen = useCallback(() => {
    setShowFullscreen(false);
    
    // Resume playing inline video
    if (player) {
      player.play();
    }
    setIsPaused(false);
    
    // Audio state will be applied by the controller when context switches back
  }, [player]);

  return (
    <TouchableOpacity 
      style={styles.videoContainer} 
      onPress={handleVideoPress}
      activeOpacity={1}
    >
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.postVideo}
          contentFit="cover"
          nativeControls={false}
        />
      </View>
      
      {/* Botão de Pause - Só aparece quando pausado */}
      {isPaused && (
        <View style={styles.videoOverlay}>
          <View style={styles.pauseButton}>
            <Ionicons 
              name="pause" 
              size={50} 
              color="rgba(255, 255, 255, 0.9)" 
            />
          </View>
        </View>
      )}
      
      {/* Botão de Som - Sempre visível - Shows global audio state */}
      <TouchableOpacity 
        style={styles.muteButton} 
        onPress={(e) => {
          e.stopPropagation?.();
          handleMuteToggle();
        }}
      >
        <Ionicons 
          name={globalAudioEnabled ? 'volume-high' : 'volume-mute'} 
          size={18} 
          color="#fff" 
        />
      </TouchableOpacity>


      
      {/* Botão de Fullscreen */}
      <TouchableOpacity 
        style={styles.fullscreenBtn} 
        onPress={(e) => {
          e.stopPropagation?.();
          handleEnterFullscreen();
        }}
      >
        <Ionicons 
          name="scan-outline" 
          size={18} 
          color="#fff" 
        />
      </TouchableOpacity>
      
      {/* Barra de Progresso */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      {/* Modal Fullscreen */}
      <VideoFullscreenModal
        visible={showFullscreen}
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        isHorizontal={isHorizontal}
        videos={videos}
        currentVideoId={currentVideoId}
        onClose={handleExitFullscreen}
        globalAudioEnabled={globalAudioEnabled}
        inlineVideoId={playerId}
      />
    </TouchableOpacity>
  );
};

export default function FeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, activeTraining, updateUser } = useApp();
  const { showToast } = useToast();
  
  // State for modals
  const [selectedPost, setSelectedPost] = useState<{ id: number; authorId: number; content: string; authorName: string; imageUrl?: string } | null>(null);
  
  // State for view mode (Feed or Grid)
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [showEditBioModal, setShowEditBioModal] = useState(false);
  const [gridBioText, setGridBioText] = useState(user?.gridBio || '');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<number | null>(null);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesPostId, setLikesPostId] = useState<number | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Instagram-style global audio state using FeedAudioController
  const [globalAudioEnabled, setGlobalAudioEnabled] = useState(false);
  const [activeVideoPostId, setActiveVideoPostId] = useState<number | null>(null);
  const [anyVideoVisible, setAnyVideoVisible] = useState(true); // Track if any video is visible in viewport
  
  // Refs for scroll position tracking
  const scrollViewRef = useRef<ScrollView>(null);
  const postPositionsRef = useRef<{ [key: number]: { top: number; height: number } }>({});
  
  // Subscribe to audio controller state changes
  useEffect(() => {
    const unsubscribe = FeedAudioController.addListener((state) => {
      setGlobalAudioEnabled(state.audioEnabled);
    });
    return unsubscribe;
  }, []);
  
  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await api.getUnreadSocialNotificationsCount();
        setUnreadNotificationsCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread notifications count:', error);
      }
    };
    
    if (user?.id) {
      fetchUnreadCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);
  
  // Reset audio state when screen loses/gains focus
  // When leaving Feed: mute all audio
  // When returning to Feed: start with audio muted (user must click speaker to enable)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - reset audio to muted state
      console.log('[FeedScreen] Screen focused - resetting audio to muted');
      FeedAudioController.setAudioEnabled(false);
      setGlobalAudioEnabled(false);
      
      // Cleanup when screen loses focus - mute all audio
      return () => {
        console.log('[FeedScreen] Screen blurred - muting all audio');
        FeedAudioController.muteAll();
        FeedAudioController.setAudioEnabled(false);
      };
    }, [])
  );
  
  // Toggle global audio state - Instagram style
  // This is called by InlineVideoPlayer AFTER it has already toggled the audio
  // So we just need to update the local state from the controller
  const handleGlobalAudioToggle = useCallback(() => {
    // Get the current state from the controller (already toggled by InlineVideoPlayer)
    const currentState = FeedAudioController.isAudioEnabled();
    setGlobalAudioEnabled(currentState);
    console.log(`[FeedScreen] handleGlobalAudioToggle - currentState: ${currentState}`);
  }, []);
  
  // Handle entering fullscreen - switch context to FULLSCREEN
  const handleEnterFullscreen = useCallback((videoId: string) => {
    FeedAudioController.enterFullscreen(videoId);
  }, []);
  
  // Handle scroll to detect which video is in focus
  // Audio only switches when current video is LESS than 50% visible
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportHeight = event.nativeEvent.layoutMeasurement.height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + viewportHeight;
    
    // Get all video posts
    const videoPosts = feedPosts.filter((p: any) => p.videoUrl);
    
    // Calculate visibility for each video
    let currentVideoVisibility = 0; // Visibility of the currently active video
    let bestCandidateId: number | null = null;
    let bestCandidateVisibility = 0;
    
    videoPosts.forEach((post: any) => {
      const position = postPositionsRef.current[post.id];
      if (!position) return;
      
      const postTop = position.top;
      const postBottom = position.top + position.height;
      const postHeight = position.height;
      
      // Calculate visible portion of the post
      const visibleTop = Math.max(postTop, viewportTop);
      const visibleBottom = Math.min(postBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityPercent = postHeight > 0 ? (visibleHeight / postHeight) * 100 : 0;
      
      // Track current video's visibility
      if (post.id === activeVideoPostId) {
        currentVideoVisibility = visibilityPercent;
      }
      
      // Track the best candidate (video with highest visibility)
      if (visibilityPercent > bestCandidateVisibility) {
        bestCandidateVisibility = visibilityPercent;
        bestCandidateId = post.id;
      }
    });
    
    // Determine if we should switch audio
    // Rule: Only switch when current video is LESS than 50% visible
    let shouldSwitchTo: number | null = null;
    
    if (activeVideoPostId === null) {
      // No current video - switch to best candidate if it's at least 20% visible
      if (bestCandidateVisibility >= 20) {
        shouldSwitchTo = bestCandidateId;
      }
    } else if (currentVideoVisibility < 50) {
      // Current video is less than 50% visible - switch to best candidate
      if (bestCandidateId !== activeVideoPostId && bestCandidateVisibility >= 20) {
        shouldSwitchTo = bestCandidateId;
      } else if (bestCandidateVisibility < 20) {
        // No video is sufficiently visible
        shouldSwitchTo = null;
      }
    }
    // If current video is >= 50% visible, don't switch (keep current)
    
    // CASE 1: Switch to a new video
    if (shouldSwitchTo !== null && shouldSwitchTo !== activeVideoPostId) {
      // Mark that a video is visible
      if (!anyVideoVisible) {
        setAnyVideoVisible(true);
      }
      
      setActiveVideoPostId(shouldSwitchTo);
      
      // Notify controller about focus change
      const playerId = `inline-${shouldSwitchTo}`;
      FeedAudioController.setInlineFocus(playerId);
    }
    
    // CASE 2: NO video is visible (all videos < 20% visible)
    if (bestCandidateVisibility < 20 && anyVideoVisible) {
      setAnyVideoVisible(false);
    } else if (bestCandidateVisibility >= 20 && !anyVideoVisible) {
      setAnyVideoVisible(true);
    }
  }, [feedPosts, activeVideoPostId, anyVideoVisible]);
  
  // Store post position when it's laid out
  const handlePostLayout = useCallback((postId: number, event: any) => {
    const { y, height } = event.nativeEvent.layout;
    postPositionsRef.current[postId] = { top: y, height };
    
    // If this is the first video and no active video yet, set it as active
    if (activeVideoPostId === null) {
      const videoPosts = feedPosts.filter((p: any) => p.videoUrl);
      if (videoPosts.length > 0 && videoPosts[0].id === postId) {
        setActiveVideoPostId(postId);
        const playerId = `inline-${postId}`;
        FeedAudioController.setInlineFocus(playerId);
      }
    }
  }, [feedPosts, activeVideoPostId]);
  
  // Pull-to-refresh animation (Instagram style)
  const spinValue = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the feed hook for real API integration
  const { 
    posts: feedPosts, 
    loading: feedLoading, 
    refreshing, 
    refresh: onRefresh, 
    toggleLike,
    toggleSave,
    sharePost,
    deletePost,
    loadMore 
  } = useFeed();
  
  const upcomingTrainings = getUpcomingTrainings();

  // Instagram-style refresh animation
  const startSpinAnimation = () => {
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    startSpinAnimation();
    await onRefresh();
    setIsRefreshing(false);
    spinValue.stopAnimation();
  }, [onRefresh]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Função para lidar com o clique no botão GPS
  const handleGPSPress = () => {
    if (activeTraining) {
      navigation.navigate('LiveTrainingMap' as any);
    } else {
      showToast('📍 Nenhum treino ativo no momento. Inicie um treino para usar o GPS!', 'info');
    }
  };

  // Handle like button press
  const handleLikePress = useCallback((postId: number) => {
    toggleLike(postId);
  }, [toggleLike]);

  // Handle likes count press - opens LikesModal
  const handleLikesCountPress = useCallback((postId: number) => {
    setLikesPostId(postId);
    setShowLikesModal(true);
  }, []);

  // Handle save button press
  const handleSavePress = useCallback((postId: number) => {
    toggleSave(postId);
    showToast('Post salvo!', 'success');
  }, [toggleSave, showToast]);

  // Handle comment button press - opens bottom sheet
  const handleCommentPress = useCallback((postId: number) => {
    setCommentsPostId(postId);
    setShowCommentsSheet(true);
  }, []);

  // Handle share button press - opens share modal
  const handleSharePress = useCallback((post: any) => {
    setSelectedPost({
      id: post.id,
      authorId: post.authorId,
      content: post.content || '',
      authorName: post.author?.name || 'Usuário',
      imageUrl: post.imageUrl || undefined,
    });
    setShowShareModal(true);
  }, []);

  // Handle share to own feed (repost)
  const handleShareToFeed = useCallback(async () => {
    if (selectedPost) {
      // Navigate to create post with repost data including image
      navigation.navigate('CreatePost' as any, {
        repostId: selectedPost.id,
        repostAuthor: selectedPost.authorName,
        repostContent: selectedPost.content,
        repostImageUrl: selectedPost.imageUrl,
      });
    }
  }, [selectedPost, navigation]);

  // Handle share completion (increment counter)
  const handleShareComplete = useCallback(async () => {
    if (selectedPost) {
      await sharePost(selectedPost.id);
      showToast('Compartilhado com sucesso!', 'success');
    }
  }, [selectedPost, sharePost, showToast]);

  // Handle more options press
  const handleMorePress = useCallback((post: any) => {
    setSelectedPost({
      id: post.id,
      authorId: post.authorId,
      content: post.content || '',
      authorName: post.author?.name || 'Usuário',
    });
    setShowOptionsModal(true);
  }, []);

  // Handle report press (from options modal)
  const handleReportPress = useCallback(() => {
    setShowOptionsModal(false);
    setTimeout(() => {
      setShowReportModal(true);
    }, 300);
  }, []);

  // Handle delete post
  const handleDeletePost = useCallback(async () => {
    if (selectedPost) {
      return await deletePost(selectedPost.id);
    }
    return false;
  }, [selectedPost, deletePost]);

  const displayName = user?.name || 'Usuário';
  const firstName = displayName.split(' ')[0];

  // Post Card - Estilo Instagram
  const renderPost = ({ item, index }: { item: any; index: number }) => {
    const totalReactions = Object.values(item.reactions || {}).reduce((a: number, b: any) => a + (b as number), 0) as number;
    const isLiked = item.isLiked;
    const isSaved = item.isSaved;
    const authorAvatar = item.author?.photoUrl || item.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'User')}&background=a3e635&color=0a0a0a`;
    
    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.postAuthorSection}
            onPress={() => {
              if (item.authorId === user?.id) {
                navigation.navigate('MyGrid' as any);
              } else {
                navigation.navigate('UserGrid' as any, { userId: item.authorId, userName: item.author?.name });
              }
            }}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: authorAvatar }} 
              style={styles.postAvatar} 
            />
            <View style={styles.postHeaderInfo}>
              <Text style={styles.postAuthorName}>{item.author?.name}</Text>
              <Text style={styles.postTime}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.postMoreButton}
            onPress={() => handleMorePress(item)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Post Content */}
        {item.content && (
          <Text style={styles.postContent}>{item.content}</Text>
        )}

        {/* Post Image */}
        {item.imageUrl && !item.videoUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
        )}

        {/* Post Video */}
        {item.videoUrl && (
          <InlineVideoPlayer 
            videoUrl={item.videoUrl} 
            thumbnailUrl={item.videoThumbnailUrl || item.imageUrl}
            aspectMode={item.videoAspectMode || 'fit'}
            currentVideoId={item.id}
            isActive={activeVideoPostId === item.id && anyVideoVisible}
            globalAudioEnabled={globalAudioEnabled}
            onMuteToggle={handleGlobalAudioToggle}
            onEnterFullscreen={handleEnterFullscreen}
            videos={feedPosts
              .filter((p: any) => p.videoUrl)
              .map((p: any) => ({
                id: p.id,
                videoUrl: p.videoUrl,
                thumbnailUrl: p.videoThumbnailUrl || p.imageUrl,
                authorName: p.author?.name || 'Usuário',
                content: p.content,
              }))
            }
          />
        )}

        {/* Activity Stats */}
        {item.type === 'activity' && item.activityData && (() => {
          const activityData = typeof item.activityData === 'string' ? JSON.parse(item.activityData) : item.activityData;
          return (
            <View style={styles.activityStats}>
              <View style={styles.activityStatItem}>
                <Ionicons name="speedometer-outline" size={16} color={COLORS.primary} />
                <Text style={styles.activityStatValue}>{activityData.distance || '-'}</Text>
                <Text style={styles.activityStatLabel}>km</Text>
              </View>
              <View style={styles.activityStatDivider} />
              <View style={styles.activityStatItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                <Text style={styles.activityStatValue}>{activityData.duration || '-'}</Text>
                <Text style={styles.activityStatLabel}>min</Text>
              </View>
              <View style={styles.activityStatDivider} />
              <View style={styles.activityStatItem}>
                <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                <Text style={styles.activityStatValue}>{activityData.pace || '-'}</Text>
                <Text style={styles.activityStatLabel}>/km</Text>
              </View>
            </View>
          );
        })()}

        {/* Poll Options */}
        {item.type === 'poll' && item.pollOptions && (
          <View style={styles.pollContainer}>
            {(typeof item.pollOptions === 'string' ? JSON.parse(item.pollOptions) : item.pollOptions).map((option: any, idx: number) => {
              const totalVotes = (typeof item.pollOptions === 'string' ? JSON.parse(item.pollOptions) : item.pollOptions).reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0);
              const percentage = totalVotes > 0 ? Math.round((option.votes || 0) / totalVotes * 100) : 0;
              return (
                <TouchableOpacity key={option.id || idx} style={styles.pollOption}>
                  <View style={[styles.pollOptionBar, { width: `${percentage}%` }]} />
                  <Text style={styles.pollOptionText}>{option.text}</Text>
                  <Text style={styles.pollOptionPercent}>{percentage}%</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.pollTotalVotes}>
              {(typeof item.pollOptions === 'string' ? JSON.parse(item.pollOptions) : item.pollOptions).reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0)} votos
            </Text>
          </View>
        )}

        {/* Clean Engagement Bar */}
        <View style={styles.engagementBar}>
          <View style={styles.engagementLeft}>
            {/* Like Button */}
            <TouchableOpacity 
              style={styles.engagementBtn}
              onPress={() => handleLikePress(item.id)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={22} 
                color={isLiked ? '#ef4444' : COLORS.text} 
              />
              {totalReactions > 0 && <Text style={styles.engagementCount}>{totalReactions}</Text>}
            </TouchableOpacity>
            
            {/* Comment Button */}
            <TouchableOpacity 
              style={styles.engagementBtn}
              onPress={() => handleCommentPress(item.id)}
            >
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.text} />
              {item.commentsCount > 0 && <Text style={styles.engagementCount}>{item.commentsCount}</Text>}
            </TouchableOpacity>
            
            {/* Share Button */}
            <TouchableOpacity 
              style={styles.engagementBtn}
              onPress={() => handleSharePress(item)}
            >
              <Ionicons name="paper-plane-outline" size={20} color={COLORS.text} />
              {(item.sharesCount || 0) > 0 && <Text style={styles.engagementCount}>{item.sharesCount}</Text>}
            </TouchableOpacity>
          </View>
          
          {/* Save Button */}
          <TouchableOpacity 
            style={styles.engagementBtn}
            onPress={() => handleSavePress(item.id)}
          >
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isSaved ? COLORS.primary : COLORS.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Quem curtiu? link - sempre visível em todos os posts */}
        <TouchableOpacity onPress={() => handleLikesCountPress(item.id)} style={styles.quemCurtiuContainer}>
          <Text style={styles.quemCurtiuText}>Quem curtiu?</Text>
        </TouchableOpacity>

      </View>
    );
  };

  // Training Card - Compacto para lista horizontal
  const renderTrainingCard = ({ item }: { item: any }) => {
    const typeConfig = TRAINING_TYPE_CONFIG[item.trainingType] || TRAINING_TYPE_CONFIG.default;
    const trainingDate = formatTrainingDate(item.scheduledAt);
    const trainingTime = formatTime(item.scheduledAt);
    
    return (
      <TouchableOpacity 
        style={styles.trainingCard}
        onPress={() => navigation.navigate('TrainingDetail', { trainingId: item.id.toString() })}
        activeOpacity={0.9}
      >
        {/* Conteúdo principal */}
        <View style={styles.trainingCardContent}>
          {/* Linha superior: Data à esquerda, Badge + Hora à direita */}
          <View style={styles.trainingTopRow}>
            <View style={styles.trainingDateColumn}>
              <Text style={styles.trainingDateLine1}>{trainingDate.line1}</Text>
              <Text style={styles.trainingDateLine2}>{trainingDate.line2}</Text>
            </View>
            <View style={styles.trainingBadgeTimeColumn}>
              <View style={[styles.trainingTypeBadge, { backgroundColor: typeConfig.color + '20' }]}>
                <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
              </View>
              <Text style={styles.trainingTimeText}>{trainingTime}</Text>
            </View>
          </View>
          
          {/* Título do treino */}
          <Text style={styles.trainingTitle} numberOfLines={1}>{item.title}</Text>
          
          {/* Grupo */}
          <Text style={styles.trainingGroup} numberOfLines={1}>{item.group?.name}</Text>
          
          {/* Info row: local e participantes */}
          <View style={styles.trainingInfoRow}>
            <View style={styles.trainingInfoItem}>
              <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
              <Text style={styles.trainingInfoText} numberOfLines={1}>{item.meetingPoint}</Text>
            </View>
            <View style={styles.trainingInfoItem}>
              <Ionicons name="people-outline" size={10} color={COLORS.textMuted} />
              <Text style={styles.trainingInfoText}>{item.goingCount}</Text>
            </View>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header - Clean & Minimal com Logo Maior */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('SocialNotifications' as any)}
            >
              <Ionicons name={unreadNotificationsCount > 0 ? "heart" : "heart-outline"} size={24} color={unreadNotificationsCount > 0 ? '#FF4444' : COLORS.text} />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('ChatList' as any)}
            >
              <Ionicons name="chatbubble-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('MyGrid' as any)}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.profileImage} />
              ) : (
                <LinearGradient
                  colors={['#a3e635', '#65a30d']}
                  style={styles.profileGradient}
                >
                  <Text style={styles.profileInitial}>{firstName.charAt(0)}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.card}
          />
        }
      >
        {/* Instagram-style loading indicator */}
        {isRefreshing && (
          <View style={styles.refreshIndicator}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh" size={24} color={COLORS.primary} />
            </Animated.View>
          </View>
        )}

        {/* Quick Actions - Rolável com o Feed */}
        <View style={styles.quickActionsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsList}
          >
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionItem}
                onPress={() => {
                  if (action.id === 'gps') {
                    handleGPSPress();
                  } else {
                    navigation.navigate(action.screen as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.quickActionIcon, 
                  { backgroundColor: action.color + '15' },
                  action.id === 'gps' && activeTraining && styles.quickActionIconActive
                ]}>
                  <Ionicons name={action.icon as any} size={26} color={action.color} />
                  {action.id === 'gps' && activeTraining && (
                    <View style={styles.activeIndicator} />
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Próximos Treinos - Substituindo Meus Grupos */}
        {upcomingTrainings.length > 0 && (
          <View style={styles.trainingsSection}>
            <View style={styles.sectionHeaderCompact}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="fitness" size={14} color={COLORS.primary} />
                <Text style={styles.sectionTitleSmall}>Próximos Treinos</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Agenda' as any)}>
                <Text style={styles.sectionLinkSmall}>Ver agenda</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trainingsList}
            >
              {upcomingTrainings.map((training) => (
                <View key={training.id}>
                  {renderTrainingCard({ item: training })}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Feed/Grid Section */}
        <View style={styles.feedSection}>
          {/* Toggle Feed/Grid */}
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, viewMode === 'feed' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('feed')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'feed' && styles.viewToggleTextActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'grid' && styles.viewToggleTextActive]}>Grid</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.searchAthleteBtn}
              onPress={() => navigation.navigate('SearchAthletes' as any)}
            >
              <Ionicons name="search" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {viewMode === 'feed' ? (
            // Feed View - Posts em lista
            feedPosts.map((post, index) => (
              <View 
                key={post.id} 
                style={styles.postWrapper}
                onLayout={(event) => {
                  // Track position of video posts for scroll-based focus detection
                  if (post.videoUrl) {
                    handlePostLayout(post.id, event);
                  }
                }}
              >
                {renderPost({ item: post, index })}
              </View>
            ))
          ) : (
            // Grid View - Perfil estilo Instagram
            <View style={styles.gridContainer}>
              {/* Profile Header - Tap to open full MyGrid */}
              <TouchableOpacity 
                style={styles.gridProfileHeader}
                onPress={() => navigation.navigate('MyGrid' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.gridAvatarWrapper}>
                  <Image 
                    source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=a3e635&color=0a0a0a&size=200` }} 
                    style={styles.gridProfileAvatar}
                  />
                  <TouchableOpacity 
                    style={styles.gridEditAvatarBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      navigation.navigate('EditProfile' as any);
                    }}
                  >
                    <Ionicons name="pencil" size={10} color={COLORS.background} />
                  </TouchableOpacity>
                </View>
                <View style={styles.gridProfileStats}>
                  <View style={styles.gridStatItem}>
                    <Text style={styles.gridStatNumber}>{feedPosts.filter((p: any) => p.authorId === user?.id).length}</Text>
                    <Text style={styles.gridStatLabel}>Posts</Text>
                  </View>
                  <View style={styles.gridStatItem}>
                    <Text style={styles.gridStatNumber}>0</Text>
                    <Text style={styles.gridStatLabel}>Seguidores</Text>
                  </View>
                  <View style={styles.gridStatItem}>
                    <Text style={styles.gridStatNumber}>0</Text>
                    <Text style={styles.gridStatLabel}>Seguindo</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Profile Info */}
              <View style={styles.gridProfileInfo}>
                <Text style={styles.gridProfileName}>{user?.name || 'Usuário'}</Text>
                <View style={styles.gridBioRow}>
                  <LinkifiedText 
                    text={gridBioText || user?.gridBio || 'Adicione uma bio...'}
                    style={styles.gridProfileBio}
                  />
                  <TouchableOpacity 
                    style={styles.gridEditBioBtn}
                    onPress={() => navigation.navigate('EditGridBio' as any)}
                  >
                    <Ionicons name="pencil" size={12} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                
                {/* Localização e Categoria */}
                <View style={styles.gridProfileMeta}>
                  {(user?.city || user?.state || user?.country) && (
                    <View style={styles.gridMetaItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.gridMetaText}>
                        {[user?.city, user?.state, user?.country].filter(Boolean).join(', ') || 'Brasil'}
                      </Text>
                    </View>
                  )}
                  
                  {user?.athleteCategory && (
                    <View style={styles.gridMetaItem}>
                      <Ionicons name="ribbon-outline" size={14} color={COLORS.primary} />
                      <Text style={[styles.gridMetaText, styles.gridCategoryText]}>
                        {user.athleteCategory === 'PRO' ? 'Atleta Profissional' :
                         user.athleteCategory === 'AMATEUR' ? 'Atleta Amador' : 
                         user.athleteCategory === 'COACH' ? 'Instrutor' : user.athleteCategory}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Modalidades */}
                {user?.sports && (() => {
                  try {
                    const sports = typeof user.sports === 'string' ? JSON.parse(user.sports) : user.sports;
                    if (Array.isArray(sports) && sports.length > 0) {
                      return (
                        <View style={styles.gridSportsContainer}>
                          {sports.slice(0, 5).map((sport: string, index: number) => (
                            <View key={index} style={styles.gridSportTag}>
                              <Text style={styles.gridSportTagText}>{sport}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
                
                {/* Botão Compartilhar */}
                <TouchableOpacity 
                  style={styles.gridShareButton}
                  onPress={async () => {
                    try {
                      const { Share } = await import('react-native');
                      await Share.share({
                        message: `Confira o perfil de ${user?.name} no Sou Esporte!`,
                        url: `https://souesporte.com/athlete/${user?.id}`,
                      });
                    } catch (error) {
                      console.error('Error sharing:', error);
                    }
                  }}
                >
                  <Ionicons name="share-outline" size={16} color={COLORS.text} />
                  <Text style={styles.gridShareButtonText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
              
              {/* Grid de Posts - Usando componente GridItem unificado */}
              <View style={styles.gridPostsContainer}>
                {feedPosts.filter((p: any) => p.authorId === user?.id).map((post: any) => (
                  <GridItem
                    key={post.id}
                    id={post.id}
                    thumbnailUrl={post.videoThumbnailUrl || post.imageUrl}
                    mediaUrl={post.imageUrl}
                    videoUrl={post.videoUrl}
                    mediaType={post.videoUrl ? 'video' : 'image'}
                    content={post.content}
                    size={(width - 8) / 3}
                    gap={2}
                    columns={3}
                    source="feed_grid"
                  />
                ))}
              </View>
            </View>
          )}
        </View>


        {/* Spacer para o FAB e Bottom Navigation */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* FAB - Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost' as any)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#0a0a0a" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="home"
        onNavigate={(screen) => navigation.navigate(screen as any)}
      />

      {/* Post Options Modal */}
      {selectedPost && (
        <PostOptionsModal
          visible={showOptionsModal}
          onClose={() => {
            setShowOptionsModal(false);
          }}
          postId={selectedPost.id}
          authorId={selectedPost.authorId}
          onDelete={handleDeletePost}
          onReport={handleReportPress}
        />
      )}

      {/* Share Modal */}
      {selectedPost && (
        <ShareModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
          }}
          postId={selectedPost.id}
          postContent={selectedPost.content}
          postAuthor={selectedPost.authorName}
          onShareToFeed={handleShareToFeed}
          onShareComplete={handleShareComplete}
        />
      )}

      {/* Report Modal */}
      {selectedPost && (
        <ReportModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedPost(null);
          }}
          contentType="post"
          contentId={selectedPost.id}
        />
      )}

      {/* Comments Bottom Sheet - Instagram Style */}
      {commentsPostId && (
        <CommentsBottomSheet
          visible={showCommentsSheet}
          postId={commentsPostId}
          onClose={() => {
            setShowCommentsSheet(false);
            setCommentsPostId(null);
          }}
          onCommentAdded={() => {
            // Refresh feed to update comment count
            onRefresh();
          }}
          onNavigateToProfile={(userId, userName) => {
            if (userId === user?.id) {
              navigation.navigate('MyGrid' as any);
            } else {
              navigation.navigate('UserGrid' as any, { userId, userName });
            }
          }}
        />
      )}

      {/* Likes Modal - Instagram Style */}
      {likesPostId && (
        <LikesModal
          visible={showLikesModal}
          postId={likesPostId}
          currentUserId={user?.id || 0}
          onClose={() => {
            setShowLikesModal(false);
            setLikesPostId(null);
          }}
          onFollowUser={(userId) => {
            showToast('Seguindo!', 'success');
          }}
          onNavigateToProfile={(userId, userName) => {
            if (userId === user?.id) {
              navigation.navigate('MyGrid' as any);
            } else {
              navigation.navigate('UserGrid' as any, { userId, userName });
            }
          }}
        />
      )}

      {/* Modal Editar Apresentação do Grid - Redireciona para tela completa */}
      <Modal
        visible={showEditBioModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditBioModal(false)}
      >
        <View style={styles.editBioModalOverlay}>
          <View style={styles.editBioModalContent}>
            <View style={styles.editBioModalHeader}>
              <Text style={styles.editBioModalTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setShowEditBioModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.editBioHint}>
              Edite seu perfil completo com localização, categoria de atleta e modalidades.
            </Text>
            
            <TouchableOpacity 
              style={styles.editBioSaveBtn}
              onPress={() => {
                setShowEditBioModal(false);
                navigation.navigate('EditGridBio' as any);
              }}
            >
              <Text style={styles.editBioSaveBtnText}>Abrir Editor de Perfil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.editBioCancelBtn}
              onPress={() => setShowEditBioModal(false)}
            >
              <Text style={styles.editBioCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
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
  headerSafe: {
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  logoImage: {
    width: 150,
    height: 45,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  profileButton: {
    marginLeft: 4,
  },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileImagePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  content: {
    flex: 1,
  },

  // Instagram-style refresh indicator
  refreshIndicator: {
    alignItems: 'center',
    paddingVertical: 10,
  },

  // Quick Actions Section
  quickActionsSection: {
    paddingVertical: 10,
    marginBottom: 0,
  },
  quickActionsList: {
    paddingHorizontal: 0,
    justifyContent: 'space-evenly',
    flex: 1,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 78,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
    position: 'relative',
  },
  quickActionIconActive: {
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Section
  section: {
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  sectionLinkSmall: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Trainings Section - Compacta
  trainingsSection: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  trainingsList: {
    paddingHorizontal: 18,
    gap: 12,
  },
  trainingCard: {
    width: 195,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  trainingTypeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  trainingBadgeTimeColumn: {
    alignItems: 'flex-end',
    gap: 3,
  },
  trainingCardContent: {
    padding: 12,
  },
  trainingDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  trainingDateColumn: {
    flexDirection: 'column',
  },
  trainingDateLine1: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  trainingDateLine2: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
    opacity: 0.8,
  },
  trainingTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  trainingGroup: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  trainingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  trainingInfoText: {
    fontSize: 10,
    color: COLORS.textMuted,
    flex: 1,
  },
  trainingTypeIndicator: {
    height: 3,
    width: '100%',
  },

  // Feed Section
  feedSection: {
    paddingTop: 16,
  },

  // Post Wrapper - Separação entre posts
  postWrapper: {
    marginBottom: 24,
  },
  // Post Card - Sem background para visual clean
  postCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  postAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  postMoreButton: {
    padding: 8,
  },
  postContent: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
  },
  
  // Video Player Styles
  videoContainer: {
    width: '100%',
    aspectRatio: 4/5, // Formato Reels/Instagram - mais vertical
    backgroundColor: '#000',
    position: 'relative',
    borderRadius: 0, // Sem bordas arredondadas igual Instagram
    overflow: 'hidden', // Corta o vídeo que excede o container
  },
  postVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 5,
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectToggleBtn: {
    position: 'absolute',
    bottom: 12,
    right: 52,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  videoWrapperFit: {
    backgroundColor: COLORS.background,
  },
  postVideoFit: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },

  // Activity Stats
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  activityStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  activityStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },

  // Clean Engagement Bar - Sem borda para visual clean
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  likesText: {
    fontSize: 10,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quemCurtiuContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quemCurtiuText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },

  // Poll Styles
  pollContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(163, 230, 53, 0.2)',
    borderRadius: 8,
  },
  pollOptionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    zIndex: 1,
  },
  pollOptionPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    zIndex: 1,
  },
  pollTotalVotes: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // View Toggle (Feed/Grid)
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  viewToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  viewToggleBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  viewToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  viewToggleTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  
  // Grid View Styles
  gridContainer: {
    flex: 1,
  },
  gridProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 24,
  },
  gridAvatarWrapper: {
    position: 'relative',
  },
  gridProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  gridEditAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  gridProfileStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridStatItem: {
    alignItems: 'center',
  },
  gridStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  gridStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  gridProfileInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gridProfileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  gridBioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridProfileBio: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  gridEditBioBtn: {
    padding: 4,
    marginLeft: 8,
  },
  gridProfileMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  gridMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridMetaText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  gridCategoryText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  gridSportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  gridSportTag: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridSportTagText: {
    fontSize: 12,
    color: COLORS.text,
  },
  gridShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  gridShareButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  gridPostsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 0,
  },
  gridPostItem: {
    width: width / 3 - 2,
    height: width / 3 - 2,
    margin: 1,
    backgroundColor: COLORS.card,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editProfileBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  gridPostImage: {
    width: '100%',
    height: '100%',
  },
  gridPostPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  gridPostPlaceholderText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  gridVideoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },

  // FAB - Canto direito acima de Perfil
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal Editar Bio
  editBioModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  editBioModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  editBioModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editBioModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  editBioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  editBioHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  editBioNameContainer: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editBioNameText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  editBioInput: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editBioCharCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  editBioSaveBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  editBioSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  editBioCancelBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  editBioCancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  searchAthleteBtn: {
    marginLeft: 'auto',
    padding: 8,
  },
});

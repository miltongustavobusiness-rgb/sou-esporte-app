import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { FeedAudioController } from '../utils/FeedAudioController';
import { toBool } from '../utils/bool';

interface VideoItem {
  id: number;
  videoUrl: string;
  thumbnailUrl?: string;
  authorName?: string;
  content?: string;
}

interface VideoFullscreenModalProps {
  visible: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  isHorizontal?: boolean;
  videos?: VideoItem[];
  currentVideoId?: number;
  onClose: () => void;
  globalAudioEnabled?: boolean;
  inlineVideoId?: string; // The inline video ID to return focus to when closing
}

// Individual fullscreen video item component
// Uses expo-video for synchronous audio control
const FullscreenVideoItem = React.memo(({
  item,
  index,
  isCurrentVideo,
  audioEnabled,
  screenWidth,
  screenHeight,
  onMuteToggle,
}: {
  item: VideoItem;
  index: number;
  isCurrentVideo: boolean;
  audioEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
  onMuteToggle: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate unique player ID
  const playerId = useMemo(() => `fullscreen-${item.id}`, [item.id]);
  
  // Create video player using expo-video hook
  const player = useVideoPlayer(item.videoUrl, (p) => {
    p.loop = true;
    p.muted = true; // Start muted, controller will unmute if needed
  });

  // Register player with audio controller
  useEffect(() => {
    if (player) {
      FeedAudioController.registerFullscreenPlayer(playerId, player);
      console.log(`[FullscreenVideoItem] Registered: ${playerId}`);
    }
    return () => {
      FeedAudioController.unregisterFullscreenPlayer(playerId);
      console.log(`[FullscreenVideoItem] Unregistered: ${playerId}`);
    };
  }, [player, playerId]);

  // Apply audio and playback state based on whether this is the current video
  // SYNCHRONOUS - This is the key advantage of expo-video
  useEffect(() => {
    if (player) {
      const shouldHaveAudio = audioEnabled && isCurrentVideo;
      console.log(`[FullscreenVideoItem] ${playerId} - isCurrentVideo: ${isCurrentVideo}, shouldHaveAudio: ${shouldHaveAudio}`);
      
      // SYNCHRONOUS API - No race conditions!
      player.muted = !toBool(shouldHaveAudio);
      player.volume = shouldHaveAudio ? 1 : 0;
      
      if (isCurrentVideo) {
        // Notify controller about focus change
        FeedAudioController.setFullscreenFocus(playerId);
        
        // Play the video
        if (!player.playing) {
          player.play();
        }
      } else {
        // Pause and mute non-current videos
        if (player.playing) {
          player.pause();
        }
        player.muted = true;
      }
    }
  }, [player, isCurrentVideo, audioEnabled, playerId]);

  // Track progress using time update events
  useEffect(() => {
    if (!player) return;
    
    player.timeUpdateEventInterval = 0.5;
    
    const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) {
        setProgress(currentTime / player.duration);
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [player]);

  // Track loading state
  useEffect(() => {
    if (!player) return;
    
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsLoading(status === 'loading');
    });
    
    return () => {
      statusSub.remove();
    };
  }, [player]);

  return (
    <View style={[styles.videoPage, { width: screenWidth, height: screenHeight }]}>
      {/* Toque para mutar/desmutar */}
      <TouchableOpacity 
        activeOpacity={1}
        style={styles.touchArea}
        onPress={onMuteToggle}
      >
        <VideoView
          player={player}
          style={{ width: screenWidth, height: screenHeight }}
          contentFit="contain"
          nativeControls={false}
        />
      </TouchableOpacity>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8BC34A" />
        </View>
      )}

      {/* Barra de progresso */}
      <View style={[styles.progressBar, { width: screenWidth - 40 }]}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Info do autor */}
      {item.authorName && (
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.authorName}</Text>
          {item.content && (
            <Text style={styles.videoContent} numberOfLines={2}>
              {item.content}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

export default function VideoFullscreenModal({
  visible,
  videoUrl,
  thumbnailUrl,
  isHorizontal = false,
  videos = [],
  currentVideoId,
  onClose,
  globalAudioEnabled: initialGlobalAudioEnabled = false,
  inlineVideoId,
}: VideoFullscreenModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const flatListRef = useRef<FlatList>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(initialGlobalAudioEnabled);

  // Preparar lista de vídeos
  const videoList: VideoItem[] = useMemo(() => {
    return videos.length > 0 
      ? videos 
      : [{ id: currentVideoId || 1, videoUrl, thumbnailUrl }];
  }, [videos, currentVideoId, videoUrl, thumbnailUrl]);

  // Subscribe to audio controller state changes
  useEffect(() => {
    const unsubscribe = FeedAudioController.addListener((state) => {
      setAudioEnabled(state.audioEnabled);
    });
    return unsubscribe;
  }, []);

  // Enter fullscreen mode when modal becomes visible
  useEffect(() => {
    if (visible) {
      const initialPlayerId = `fullscreen-${videoList[currentIndex]?.id || 0}`;
      FeedAudioController.enterFullscreen(initialPlayerId);
      console.log(`[VideoFullscreenModal] Entered fullscreen mode: ${initialPlayerId}`);
    }
  }, [visible]);

  // Encontrar índice inicial e scroll para ele
  useEffect(() => {
    if (visible && currentVideoId && videos.length > 0) {
      const index = videos.findIndex(v => v.id === currentVideoId);
      if (index !== -1) {
        setCurrentIndex(index);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 100);
      }
    }
  }, [visible, currentVideoId, videos]);

  // Handle mute toggle - toggles global audio state
  const handleMuteToggle = useCallback(() => {
    const newAudioState = FeedAudioController.toggleAudio();
    setAudioEnabled(newAudioState);
  }, []);

  // Handle close - switch context back to inline feed
  const handleClose = useCallback(() => {
    console.log('[VideoFullscreenModal] Closing modal - switching context back to inline');
    
    // Clear all fullscreen players and switch context back to inline
    FeedAudioController.clearFullscreenPlayers();
    FeedAudioController.exitFullscreen();
    
    // Call the onClose callback
    onClose();
  }, [onClose]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== undefined && newIndex !== currentIndex) {
        console.log(`[VideoFullscreenModal] View changed to index: ${newIndex}`);
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderVideoItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => {
    return (
      <FullscreenVideoItem
        item={item}
        index={index}
        isCurrentVideo={index === currentIndex}
        audioEnabled={audioEnabled}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        onMuteToggle={handleMuteToggle}
      />
    );
  }, [currentIndex, audioEnabled, screenWidth, screenHeight, handleMuteToggle]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* FlatList vertical para swipe entre vídeos */}
        <FlatList
          ref={flatListRef}
          data={videoList}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          horizontal={false}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: screenHeight,
            offset: screenHeight * index,
            index,
          })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
        />

        {/* Botão de fechar */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Botão de som */}
        <TouchableOpacity style={styles.muteButton} onPress={handleMuteToggle}>
          <Ionicons 
            name={audioEnabled ? 'volume-high' : 'volume-mute'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>

        {/* Indicador de navegação */}
        {videoList.length > 1 && (
          <View style={styles.navigationHint}>
            <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.navigationText}>
              {currentIndex + 1} / {videoList.length}
            </Text>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.5)" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  muteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  progressBar: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    height: 4,
    zIndex: 10,
  },
  progressBackground: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8BC34A',
    borderRadius: 2,
  },
  authorInfo: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 80,
    zIndex: 10,
  },
  authorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  videoContent: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  navigationHint: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -40 }],
    alignItems: 'center',
    zIndex: 10,
  },
  navigationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginVertical: 4,
  },
});

/**
 * FeedAudioController - Unified Audio State Machine for expo-video
 * 
 * This controller manages audio state for both inline feed and fullscreen modes.
 * It uses expo-video's synchronous API (player.muted = true/false) for immediate control.
 * 
 * KEY FEATURES:
 * - Single source of truth for audio state
 * - Synchronous audio control (no async race conditions)
 * - Context switching between INLINE and FULLSCREEN
 * - Early activation (20% visibility threshold)
 * - Only ONE audio source active at any time
 * 
 * ARCHITECTURE:
 * - audioEnabled: Global preference (user wants audio on/off)
 * - context: Current context (INLINE or FULLSCREEN)
 * - activeVideoId: The video that should have audio in current context
 * - inlinePlayers: Map of inline video players
 * - fullscreenPlayers: Map of fullscreen video players
 */

import { VideoPlayer } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AudioContext = 'INLINE' | 'FULLSCREEN';

interface AudioState {
  audioEnabled: boolean;
  context: AudioContext;
  activeVideoId: string | null;
}

type AudioStateListener = (state: AudioState) => void;

class FeedAudioControllerClass {
  // ==================== STATE ====================
  private audioEnabled: boolean = false;
  private context: AudioContext = 'INLINE';
  private activeInlineVideoId: string | null = null;
  private activeFullscreenVideoId: string | null = null;
  
  // ==================== PLAYER REGISTRIES ====================
  private inlinePlayers: Map<string, VideoPlayer | null> = new Map();
  private fullscreenPlayers: Map<string, VideoPlayer | null> = new Map();
  
  // ==================== LISTENERS ====================
  private listeners: Set<AudioStateListener> = new Set();
  
  // ==================== DEBUG ====================
  private debug: boolean = true;
  
  constructor() {
    this.loadAudioPreference();
  }
  
  private log(message: string): void {
    if (this.debug) {
      console.log(`[FeedAudioController] ${message}`);
    }
  }
  
  // ==================== PERSISTENCE ====================
  
  private async loadAudioPreference(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('feed_audio_enabled');
      if (saved !== null) {
        this.audioEnabled = saved === 'true';
        this.log(`Loaded audio preference: ${this.audioEnabled}`);
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  private async saveAudioPreference(): Promise<void> {
    try {
      await AsyncStorage.setItem('feed_audio_enabled', String(this.audioEnabled));
    } catch (e) {
      // Ignore errors
    }
  }
  
  // ==================== LISTENERS ====================
  
  addListener(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
  
  getState(): AudioState {
    return {
      audioEnabled: this.audioEnabled,
      context: this.context,
      activeVideoId: this.context === 'INLINE' 
        ? this.activeInlineVideoId 
        : this.activeFullscreenVideoId,
    };
  }
  
  // ==================== PLAYER REGISTRATION ====================
  
  /**
   * Register an inline feed player (expo-video VideoPlayer)
   */
  registerInlinePlayer(videoId: string, player: VideoPlayer | null): void {
    this.log(`registerInlinePlayer: ${videoId}`);
    this.inlinePlayers.set(videoId, player);
    
    // Apply audio state immediately
    this.applyAudioToPlayer(player, videoId, 'inline');
  }
  
  /**
   * Unregister an inline feed player
   */
  unregisterInlinePlayer(videoId: string): void {
    this.log(`unregisterInlinePlayer: ${videoId}`);
    const player = this.inlinePlayers.get(videoId);
    if (player) {
      this.mutePlayer(player);
    }
    this.inlinePlayers.delete(videoId);
  }
  
  /**
   * Register a fullscreen player (expo-video VideoPlayer)
   */
  registerFullscreenPlayer(videoId: string, player: VideoPlayer | null): void {
    this.log(`registerFullscreenPlayer: ${videoId}`);
    this.fullscreenPlayers.set(videoId, player);
    
    // Apply audio state immediately
    this.applyAudioToPlayer(player, videoId, 'fullscreen');
  }
  
  /**
   * Unregister a fullscreen player
   */
  unregisterFullscreenPlayer(videoId: string): void {
    this.log(`unregisterFullscreenPlayer: ${videoId}`);
    const player = this.fullscreenPlayers.get(videoId);
    if (player) {
      this.mutePlayer(player);
    }
    this.fullscreenPlayers.delete(videoId);
  }
  
  // ==================== CORE AUDIO CONTROL ====================
  
  /**
   * Mute a player (synchronous - expo-video)
   */
  private mutePlayer(player: VideoPlayer | null): void {
    if (!player) return;
    try {
      player.muted = true;
      player.volume = 0;
    } catch (e) {
      // Ignore errors
    }
  }
  
  /**
   * Unmute a player and ensure it's playing (synchronous - expo-video)
   */
  private unmutePlayer(player: VideoPlayer | null): void {
    if (!player) return;
    try {
      this.log(`unmutePlayer - Setting muted=false, volume=1`);
      player.muted = false;
      player.volume = 1;
      
      // Verify the values were set
      this.log(`unmutePlayer - After setting: muted=${player.muted}, volume=${player.volume}`);
      
      // Ensure playing
      if (!player.playing) {
        player.play();
      }
    } catch (e) {
      this.log(`unmutePlayer - Error: ${e}`);
    }
  }
  
  /**
   * Apply audio state to a specific player based on current state
   */
  private applyAudioToPlayer(
    player: VideoPlayer | null, 
    videoId: string, 
    type: 'inline' | 'fullscreen'
  ): void {
    if (!player) return;
    
    const isCorrectContext = (type === 'inline' && this.context === 'INLINE') ||
                             (type === 'fullscreen' && this.context === 'FULLSCREEN');
    
    const activeId = this.context === 'INLINE' 
      ? this.activeInlineVideoId 
      : this.activeFullscreenVideoId;
    
    const shouldHaveAudio = this.audioEnabled && isCorrectContext && videoId === activeId;
    
    this.log(`applyAudioToPlayer: ${videoId} (${type}) - shouldHaveAudio: ${shouldHaveAudio}`);
    
    if (shouldHaveAudio) {
      this.unmutePlayer(player);
    } else {
      this.mutePlayer(player);
    }
  }
  
  /**
   * CORE: Apply audio state to ALL players
   * Only ONE player should have audio at any time
   */
  private applyAudioState(): void {
    this.log(`applyAudioState - context: ${this.context}, audioEnabled: ${this.audioEnabled}`);
    
    const activeId = this.context === 'INLINE' 
      ? this.activeInlineVideoId 
      : this.activeFullscreenVideoId;
    
    // Mute ALL inline players first
    this.inlinePlayers.forEach((player, videoId) => {
      if (this.context === 'INLINE' && videoId === activeId && this.audioEnabled) {
        this.unmutePlayer(player);
        this.log(`UNMUTED inline: ${videoId}`);
      } else {
        this.mutePlayer(player);
      }
    });
    
    // Mute ALL fullscreen players first
    this.fullscreenPlayers.forEach((player, videoId) => {
      if (this.context === 'FULLSCREEN' && videoId === activeId && this.audioEnabled) {
        this.unmutePlayer(player);
        this.log(`UNMUTED fullscreen: ${videoId}`);
      } else {
        this.mutePlayer(player);
      }
    });
    
    this.notifyListeners();
  }
  
  // ==================== PUBLIC API ====================
  
  /**
   * Toggle global audio state
   * Returns the new audio state
   */
  toggleAudio(): boolean {
    this.audioEnabled = !this.audioEnabled;
    this.log(`toggleAudio: ${this.audioEnabled}`);
    this.saveAudioPreference();
    this.applyAudioState();
    return this.audioEnabled;
  }
  
  /**
   * Set audio enabled state directly
   */
  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    this.log(`setAudioEnabled: ${enabled}`);
    this.saveAudioPreference();
    this.applyAudioState();
  }
  
  /**
   * Get current audio enabled state
   */
  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }
  
  /**
   * Set the active inline video (called on scroll)
   * IMMEDIATE audio switch to the new video
   */
  setInlineFocus(videoId: string): void {
    if (this.activeInlineVideoId === videoId) return;
    
    this.log(`setInlineFocus: ${videoId} (was: ${this.activeInlineVideoId})`);
    this.activeInlineVideoId = videoId;
    
    // Only apply if we're in INLINE context
    if (this.context === 'INLINE') {
      this.applyAudioState();
    }
  }
  
  /**
   * Set the active fullscreen video (called on swipe)
   * IMMEDIATE audio switch to the new video
   */
  setFullscreenFocus(videoId: string): void {
    if (this.activeFullscreenVideoId === videoId) return;
    
    this.log(`setFullscreenFocus: ${videoId} (was: ${this.activeFullscreenVideoId})`);
    this.activeFullscreenVideoId = videoId;
    
    // Only apply if we're in FULLSCREEN context
    if (this.context === 'FULLSCREEN') {
      this.applyAudioState();
    }
  }
  
  /**
   * Enter fullscreen mode
   * Switches context to FULLSCREEN and mutes all inline players
   */
  enterFullscreen(videoId: string): void {
    this.log(`enterFullscreen: ${videoId}`);
    
    // Mute all inline players
    this.inlinePlayers.forEach((player) => {
      this.mutePlayer(player);
    });
    
    // Switch context
    this.context = 'FULLSCREEN';
    this.activeFullscreenVideoId = videoId;
    
    this.applyAudioState();
  }
  
  /**
   * Exit fullscreen mode
   * Switches context back to INLINE
   */
  exitFullscreen(): void {
    this.log(`exitFullscreen - returning to inline: ${this.activeInlineVideoId}`);
    
    // Mute all fullscreen players
    this.fullscreenPlayers.forEach((player) => {
      this.mutePlayer(player);
    });
    
    // Switch context back to INLINE
    this.context = 'INLINE';
    
    this.applyAudioState();
  }
  
  /**
   * Get current context
   */
  getContext(): AudioContext {
    return this.context;
  }
  
  /**
   * Mute all players (used when leaving feed)
   */
  muteAll(): void {
    this.log('muteAll');
    this.inlinePlayers.forEach((player) => this.mutePlayer(player));
    this.fullscreenPlayers.forEach((player) => this.mutePlayer(player));
  }
  
  /**
   * Mute all inline players (used when no video is visible in feed)
   * This does NOT change the activeInlineVideoId, so audio will reactivate
   * when the user scrolls back to a video
   */
  muteAllInline(): void {
    this.log('muteAllInline - no video visible, muting all inline players');
    this.inlinePlayers.forEach((player, videoId) => {
      this.mutePlayer(player);
    });
  }
  
  /**
   * Clear all fullscreen players (used when closing fullscreen modal)
   */
  clearFullscreenPlayers(): void {
    this.log('clearFullscreenPlayers');
    this.fullscreenPlayers.forEach((player) => this.mutePlayer(player));
    this.fullscreenPlayers.clear();
  }
}

// Export singleton instance
export const FeedAudioController = new FeedAudioControllerClass();

/**
 * VideoAudioManager - Instagram-Style Global Audio Control System
 * 
 * This manager implements Instagram/TikTok-style audio behavior:
 * - Global audio state (feedAudioEnabled): When user enables sound on ANY video,
 *   it enables sound for the ENTIRE feed
 * - Only ONE video can emit audio at a time (the one in focus)
 * - When scrolling, audio automatically switches to the new focused video
 * - User doesn't need to re-enable sound for each video
 * 
 * Key Features:
 * - feedAudioEnabled: Global preference for audio on/off
 * - activeVideoId: Currently focused video that can play audio
 * - Automatic audio switching on scroll/focus change
 * - Seamless fullscreen integration
 */

import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PlayerType = 'feed' | 'fullscreen';

interface RegisteredPlayer {
  id: string;
  ref: Video | null;
  type: PlayerType;
}

// Storage key for persisting audio preference
const AUDIO_PREFERENCE_KEY = '@SouEsporte:feedAudioEnabled';

class VideoAudioManager {
  private static instance: VideoAudioManager;
  
  // Registered video players
  private registeredPlayers: Map<string, RegisteredPlayer> = new Map();
  
  // Global audio state - when true, the active video will have sound
  private feedAudioEnabled: boolean = false;
  
  // Currently active/focused video ID
  private activeVideoId: string | null = null;
  
  // Current mode (feed or fullscreen)
  private isFullscreenMode: boolean = false;
  
  // Listeners for state changes
  private listeners: Set<(state: { feedAudioEnabled: boolean; activeVideoId: string | null }) => void> = new Set();

  private constructor() {
    // Load persisted audio preference
    this.loadAudioPreference();
  }

  static getInstance(): VideoAudioManager {
    if (!VideoAudioManager.instance) {
      VideoAudioManager.instance = new VideoAudioManager();
    }
    return VideoAudioManager.instance;
  }

  /**
   * Load audio preference from storage
   */
  private async loadAudioPreference(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(AUDIO_PREFERENCE_KEY);
      if (stored !== null) {
        this.feedAudioEnabled = stored === 'true';
        console.log(`[AudioManager] Loaded audio preference: ${this.feedAudioEnabled}`);
      }
    } catch (error) {
      console.error('[AudioManager] Failed to load audio preference:', error);
    }
  }

  /**
   * Save audio preference to storage
   */
  private async saveAudioPreference(): Promise<void> {
    try {
      await AsyncStorage.setItem(AUDIO_PREFERENCE_KEY, String(this.feedAudioEnabled));
    } catch (error) {
      console.error('[AudioManager] Failed to save audio preference:', error);
    }
  }

  /**
   * Register a video player with the manager
   */
  registerPlayer(id: string, ref: Video | null, type: PlayerType): void {
    this.registeredPlayers.set(id, { id, ref, type });
    console.log(`[AudioManager] Registered player: ${id} (${type})`);
    
    // If this is the active video and audio is enabled, unmute it
    if (id === this.activeVideoId && this.feedAudioEnabled && ref) {
      ref.setIsMutedAsync(false).catch(() => {});
    }
  }

  /**
   * Unregister a video player
   */
  unregisterPlayer(id: string): void {
    const player = this.registeredPlayers.get(id);
    if (player) {
      // Ensure audio is stopped before unregistering
      if (player.ref) {
        player.ref.setIsMutedAsync(true).catch(() => {});
      }
      this.registeredPlayers.delete(id);
      
      if (this.activeVideoId === id) {
        this.activeVideoId = null;
      }
      console.log(`[AudioManager] Unregistered player: ${id}`);
    }
  }

  /**
   * Update player reference (useful when ref changes)
   */
  updatePlayerRef(id: string, ref: Video | null): void {
    const player = this.registeredPlayers.get(id);
    if (player) {
      player.ref = ref;
      
      // Apply correct audio state to the updated ref
      if (ref) {
        const shouldHaveAudio = id === this.activeVideoId && this.feedAudioEnabled;
        ref.setIsMutedAsync(!shouldHaveAudio).catch(() => {});
      }
    }
  }

  /**
   * Set the active/focused video
   * This is called when a new video comes into focus (e.g., during scroll)
   * The active video will automatically get audio if feedAudioEnabled is true
   */
  async setActiveVideo(videoId: string | null): Promise<void> {
    if (this.activeVideoId === videoId) return;
    
    const previousActiveId = this.activeVideoId;
    this.activeVideoId = videoId;
    
    console.log(`[AudioManager] Active video changed: ${previousActiveId} -> ${videoId}`);
    
    // Mute the previous active video
    if (previousActiveId) {
      const prevPlayer = this.registeredPlayers.get(previousActiveId);
      if (prevPlayer?.ref) {
        try {
          await prevPlayer.ref.setIsMutedAsync(true);
          console.log(`[AudioManager] Muted previous video: ${previousActiveId}`);
        } catch (error) {
          // Ignore errors
        }
      }
    }
    
    // If audio is enabled globally, unmute the new active video
    if (videoId && this.feedAudioEnabled) {
      const newPlayer = this.registeredPlayers.get(videoId);
      if (newPlayer?.ref) {
        try {
          // First mute all others to be safe
          await this.muteAllExcept(videoId);
          // Then unmute the active one
          await newPlayer.ref.setIsMutedAsync(false);
          console.log(`[AudioManager] Unmuted new active video: ${videoId}`);
        } catch (error) {
          console.error(`[AudioManager] Failed to unmute ${videoId}:`, error);
        }
      }
    }
    
    this.notifyListeners();
  }

  /**
   * Toggle global audio state
   * When enabled, the currently active video will get audio
   * When disabled, all videos are muted
   */
  async toggleAudio(): Promise<boolean> {
    this.feedAudioEnabled = !this.feedAudioEnabled;
    console.log(`[AudioManager] Audio toggled: ${this.feedAudioEnabled}`);
    
    await this.saveAudioPreference();
    
    if (this.feedAudioEnabled) {
      // Enable audio for the active video
      if (this.activeVideoId) {
        const activePlayer = this.registeredPlayers.get(this.activeVideoId);
        if (activePlayer?.ref) {
          await this.muteAllExcept(this.activeVideoId);
          await activePlayer.ref.setIsMutedAsync(false);
          console.log(`[AudioManager] Enabled audio for active video: ${this.activeVideoId}`);
        }
      }
    } else {
      // Mute all videos
      await this.muteAll();
    }
    
    this.notifyListeners();
    return this.feedAudioEnabled;
  }

  /**
   * Set global audio state directly
   */
  async setAudioEnabled(enabled: boolean): Promise<void> {
    if (this.feedAudioEnabled === enabled) return;
    
    this.feedAudioEnabled = enabled;
    console.log(`[AudioManager] Audio set to: ${this.feedAudioEnabled}`);
    
    await this.saveAudioPreference();
    
    if (enabled) {
      // Enable audio for the active video
      if (this.activeVideoId) {
        const activePlayer = this.registeredPlayers.get(this.activeVideoId);
        if (activePlayer?.ref) {
          await this.muteAllExcept(this.activeVideoId);
          await activePlayer.ref.setIsMutedAsync(false);
        }
      }
    } else {
      await this.muteAll();
    }
    
    this.notifyListeners();
  }

  /**
   * Mute all players except the specified one
   */
  async muteAllExcept(exceptId: string): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.registeredPlayers.forEach((player, id) => {
      if (id !== exceptId && player.ref) {
        const promise = player.ref.setIsMutedAsync(true).catch(() => {});
        promises.push(promise);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Mute all players
   */
  async muteAll(): Promise<void> {
    console.log('[AudioManager] Muting all players');
    const promises: Promise<void>[] = [];
    
    this.registeredPlayers.forEach((player) => {
      if (player.ref) {
        const promise = player.ref.setIsMutedAsync(true).catch(() => {});
        promises.push(promise);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Pause all feed players (used when entering fullscreen)
   */
  async pauseAllFeedPlayers(): Promise<void> {
    console.log('[AudioManager] Pausing all feed players');
    const promises: Promise<void>[] = [];
    
    this.registeredPlayers.forEach((player, id) => {
      if (player.type === 'feed' && player.ref) {
        const promise = Promise.all([
          player.ref.setIsMutedAsync(true),
          player.ref.pauseAsync(),
        ]).then(() => {
          console.log(`[AudioManager] Paused feed player: ${id}`);
        }).catch(() => {});
        promises.push(promise);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Enter fullscreen mode
   * - Pauses all feed players
   * - Fullscreen player will respect feedAudioEnabled
   */
  async enterFullscreenMode(): Promise<void> {
    console.log('[AudioManager] Entering fullscreen mode');
    this.isFullscreenMode = true;
    await this.pauseAllFeedPlayers();
    this.notifyListeners();
  }

  /**
   * Exit fullscreen mode
   * - Mutes all fullscreen players
   * - Feed will resume with the active video
   */
  async exitFullscreenMode(): Promise<void> {
    console.log('[AudioManager] Exiting fullscreen mode');
    this.isFullscreenMode = false;
    
    // Mute all fullscreen players
    const promises: Promise<void>[] = [];
    this.registeredPlayers.forEach((player, id) => {
      if (player.type === 'fullscreen' && player.ref) {
        const promise = player.ref.setIsMutedAsync(true).catch(() => {});
        promises.push(promise);
      }
    });
    
    await Promise.all(promises);
    this.notifyListeners();
  }

  /**
   * Get current global audio state
   */
  isAudioEnabled(): boolean {
    return this.feedAudioEnabled;
  }

  /**
   * Get the currently active video ID
   */
  getActiveVideoId(): string | null {
    return this.activeVideoId;
  }

  /**
   * Check if we're in fullscreen mode
   */
  isInFullscreenMode(): boolean {
    return this.isFullscreenMode;
  }

  /**
   * Check if a specific video should have audio
   */
  shouldVideoHaveAudio(videoId: string): boolean {
    return this.feedAudioEnabled && this.activeVideoId === videoId;
  }

  /**
   * Add a listener for state changes
   */
  addListener(callback: (state: { feedAudioEnabled: boolean; activeVideoId: string | null }) => void): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback({ feedAudioEnabled: this.feedAudioEnabled, activeVideoId: this.activeVideoId });
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = { feedAudioEnabled: this.feedAudioEnabled, activeVideoId: this.activeVideoId };
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Debug: Print current state
   */
  debugPrintState(): void {
    console.log('[AudioManager] Current State:');
    console.log(`  Feed Audio Enabled: ${this.feedAudioEnabled}`);
    console.log(`  Active Video: ${this.activeVideoId || 'none'}`);
    console.log(`  Fullscreen Mode: ${this.isFullscreenMode}`);
    console.log(`  Registered Players: ${this.registeredPlayers.size}`);
    this.registeredPlayers.forEach((player, id) => {
      console.log(`    - ${id}: type=${player.type}`);
    });
  }
}

// Export singleton instance
export const videoAudioManager = VideoAudioManager.getInstance();
export default videoAudioManager;

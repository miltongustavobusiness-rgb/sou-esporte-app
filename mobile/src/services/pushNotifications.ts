import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const PUSH_TOKEN_KEY = '@sou_esporte_push_token';

export interface PushNotificationData {
  type: 'event' | 'registration' | 'result' | 'team' | 'system';
  eventId?: number;
  registrationId?: number;
  teamId?: number;
}

// Lazy load expo-notifications to avoid crashes if not available
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

async function loadDependencies() {
  try {
    if (!Notifications) {
      Notifications = await import('expo-notifications');
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
    if (!Device) {
      Device = await import('expo-device');
    }
    if (!Constants) {
      Constants = await import('expo-constants');
    }
    return true;
  } catch (error) {
    console.log('Push notification dependencies not available:', error);
    return false;
  }
}

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications || !Device) {
      console.log('Push notifications not available');
      return null;
    }

    // Check if it's a physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get the project ID from Constants
    let token: string | null = null;
    const projectId = Constants?.default?.expoConfig?.extra?.eas?.projectId ?? 
                      Constants?.default?.easConfig?.projectId;
    
    if (!projectId) {
      console.log('No project ID found for push notifications');
      // For development, use a mock token
      token = 'ExponentPushToken[development]';
    } else {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushToken.data;
    }

    console.log('Push token:', token);

    // Save token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Sou Esporte',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8BC34A',
      });
    }

    return token;
  } catch (error) {
    console.log('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to backend
 */
export async function savePushTokenToBackend(token: string): Promise<boolean> {
  try {
    await api.savePushToken(token, Platform.OS);
    console.log('Push token saved to backend');
    return true;
  } catch (error) {
    console.log('Error saving push token to backend:', error);
    return false;
  }
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.log('Error getting stored push token:', error);
    return null;
  }
}

/**
 * Clear stored push token
 */
export async function clearPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.log('Error clearing push token:', error);
  }
}

/**
 * Add notification received listener (foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  if (!Notifications) {
    console.log('Notifications not loaded');
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  if (!Notifications) {
    console.log('Notifications not loaded');
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove notification subscription
 */
export function removeNotificationSubscription(subscription: any): void {
  if (Notifications && subscription) {
    Notifications.removeNotificationSubscription(subscription);
  }
}

/**
 * Get notification data from response
 */
export function getNotificationData(
  response: any
): PushNotificationData | null {
  const data = response?.notification?.request?.content?.data as PushNotificationData;
  return data || null;
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: PushNotificationData,
  seconds: number = 1
): Promise<string | null> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications) return null;
    
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as any,
        sound: true,
      },
      trigger: {
        seconds,
      },
    });
  } catch (error) {
    console.log('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Error canceling notifications:', error);
  }
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.log('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.log('Error setting badge count:', error);
  }
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  try {
    const loaded = await loadDependencies();
    if (!loaded || !Notifications) return;
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.log('Error clearing badge:', error);
  }
}

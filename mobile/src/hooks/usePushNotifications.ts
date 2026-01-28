import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from '../types';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
  getNotificationData,
  PushNotificationData,
} from '../services/pushNotifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function usePushNotifications() {
  const navigation = useNavigation<NavigationProp>();
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      setNotification(notification);
    });

    // Listen for user tapping on notification
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      const data = getNotificationData(response);
      handleNotificationNavigation(data);
    });

    return () => {
      if (notificationListener.current) {
        removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationNavigation = (data: PushNotificationData | null) => {
    if (!data) return;

    switch (data.type) {
      case 'event':
        if (data.eventId) {
          navigation.navigate('EventDetail', { eventId: data.eventId });
        }
        break;
      case 'registration':
        navigation.navigate('MyRegistrations');
        break;
      case 'result':
        navigation.navigate('Results');
        break;
      case 'team':
        if (data.teamId) {
          navigation.navigate('TeamDetail', { teamId: data.teamId });
        } else {
          navigation.navigate('Teams');
        }
        break;
      case 'system':
      default:
        navigation.navigate('Notifications');
        break;
    }
  };

  return {
    notification,
    handleNotificationNavigation,
  };
}

export default usePushNotifications;

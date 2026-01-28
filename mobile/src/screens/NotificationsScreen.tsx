import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Notification {
  id: number;
  type: 'event' | 'registration' | 'result' | 'team' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: {
    eventId?: number;
    registrationId?: number;
    teamId?: number;
  };
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'event':
      return 'calendar';
    case 'registration':
      return 'ticket';
    case 'result':
      return 'trophy';
    case 'team':
      return 'people';
    case 'system':
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'event':
      return COLORS.primary;
    case 'registration':
      return COLORS.success;
    case 'result':
      return '#FFD700';
    case 'team':
      return '#9B59B6';
    case 'system':
    default:
      return COLORS.textSecondary;
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('pt-BR');
};

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Mock data for demo
      setNotifications([
        {
          id: 1,
          type: 'event',
          title: 'Novo evento disponível!',
          message: 'Maratona de São Paulo 2026 está com inscrições abertas.',
          read: false,
          data: { eventId: 1 },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 2,
          type: 'registration',
          title: 'Inscrição confirmada',
          message: 'Sua inscrição na Corrida Noturna foi confirmada.',
          read: false,
          data: { registrationId: 1 },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          type: 'result',
          title: 'Resultado publicado',
          message: 'Os resultados da Meia Maratona foram publicados.',
          read: true,
          data: { eventId: 2 },
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 4,
          type: 'team',
          title: 'Convite de equipe',
          message: 'Você foi convidado para a equipe "Corredores SP".',
          read: true,
          data: { teamId: 1 },
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: 5,
          type: 'system',
          title: 'Bem-vindo ao Sou Esporte!',
          message: 'Explore eventos e comece a correr.',
          read: true,
          createdAt: new Date(Date.now() - 604800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await api.markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    // Navigate based on type
    if (notification.data?.eventId) {
      navigation.navigate('EventDetail', { eventId: notification.data.eventId });
    } else if (notification.data?.teamId) {
      navigation.navigate('TeamDetail', { teamId: notification.data.teamId });
    } else if (notification.data?.registrationId) {
      navigation.navigate('MyRegistrations');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificações</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Faça login</Text>
          <Text style={styles.emptyText}>
            Entre na sua conta para ver suas notificações
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificações</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Marcar lidas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
          <Text style={styles.emptyText}>
            Você receberá notificações sobre eventos, inscrições e resultados aqui.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {unreadCount > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Novas ({unreadCount})</Text>
            </View>
          )}
          
          {notifications
            .filter(n => !n.read)
            .map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationCard, styles.unreadCard]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getNotificationColor(notification.type) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getNotificationIcon(notification.type) as any}
                    size={24}
                    color={getNotificationColor(notification.type)}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.createdAt)}
                  </Text>
                </View>
                <View style={styles.unreadDot} />
              </TouchableOpacity>
            ))}

          {notifications.some(n => n.read) && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Anteriores</Text>
            </View>
          )}

          {notifications
            .filter(n => n.read)
            .map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={styles.notificationCard}
                onPress={() => handleNotificationPress(notification)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getNotificationColor(notification.type) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getNotificationIcon(notification.type) as any}
                    size={24}
                    color={getNotificationColor(notification.type)}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, styles.readTitle]}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationMessage, styles.readMessage]} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.white,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: COLORS.primary + '10',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...FONTS.body2,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  readTitle: {
    fontWeight: '400',
  },
  notificationMessage: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  readMessage: {
    color: COLORS.textMuted,
  },
  notificationTime: {
    ...FONTS.body4,
    color: COLORS.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: SIZES.padding,
  },
  emptyText: {
    ...FONTS.body3,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
  },
  loginButtonText: {
    ...FONTS.body2,
    color: COLORS.white,
    fontWeight: '600',
  },
});

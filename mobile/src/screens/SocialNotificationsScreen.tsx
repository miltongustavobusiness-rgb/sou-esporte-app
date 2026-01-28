import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import api from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SocialNotification {
  id: number;
  userId: number;
  fromUserId: number;
  type: 'new_follower' | 'follow_request' | 'follow_accepted' | 'like' | 'comment' | 'mention' | 'new_post' | 'share' | 'message' | 'event_registration' | 'event_cancel';
  postId: number | null;
  commentId: number | null;
  eventId: number | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  fromUserName: string;
  fromUserPhoto: string | null;
  fromUserUsername: string | null;
  postContent: string | null;
  postMedia: string | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_follower':
    case 'follow_request':
    case 'follow_accepted':
      return 'person-add';
    case 'like':
      return 'heart';
    case 'comment':
      return 'chatbubble';
    case 'mention':
      return 'at';
    case 'new_post':
      return 'images';
    case 'share':
      return 'share-social';
    case 'message':
      return 'mail';
    case 'event_registration':
      return 'calendar';
    case 'event_cancel':
      return 'calendar-outline';
    default:
      return 'notifications';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'like':
      return '#FF4444';
    case 'comment':
      return COLORS.primary;
    case 'new_follower':
    case 'follow_accepted':
      return '#4CAF50';
    case 'follow_request':
      return '#FF9800';
    case 'new_post':
      return '#2196F3';
    case 'message':
      return '#9C27B0';
    default:
      return COLORS.textSecondary;
  }
};

const getNotificationText = (notification: SocialNotification) => {
  const name = notification.fromUserName || 'Alguém';
  switch (notification.type) {
    case 'new_follower':
      return `${name} começou a seguir você`;
    case 'follow_request':
      return `${name} quer seguir você`;
    case 'follow_accepted':
      return `${name} aceitou seu pedido de follow`;
    case 'like':
      return `${name} curtiu seu post`;
    case 'comment':
      return `${name} comentou no seu post`;
    case 'mention':
      return `${name} mencionou você`;
    case 'new_post':
      return `${name} fez uma nova publicação`;
    case 'share':
      return `${name} compartilhou seu post`;
    case 'message':
      return `${name} enviou uma mensagem`;
    case 'event_registration':
      return `${name} se inscreveu no seu evento`;
    case 'event_cancel':
      return `${name} cancelou a inscrição no seu evento`;
    default:
      return notification.message || 'Nova notificação';
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

export default function SocialNotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated } = useApp();
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await api.getSocialNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotifications([]);
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

  const handleNotificationPress = async (notification: SocialNotification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await api.markSocialNotificationRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    // Navigate based on type
    switch (notification.type) {
      case 'new_follower':
      case 'follow_request':
      case 'follow_accepted':
        navigation.navigate('UserGrid', { 
          userId: notification.fromUserId, 
          userName: notification.fromUserName 
        });
        break;
      case 'like':
      case 'comment':
      case 'share':
      case 'new_post':
        if (notification.postId && typeof notification.postId === 'number') {
          console.log('[Notifications] Navigating to PostDetail with postId:', notification.postId);
          navigation.navigate('PostDetail' as any, { postId: notification.postId });
        } else {
          console.warn('[Notifications] Invalid postId for notification:', notification.id, notification.postId);
        }
        break;
      case 'message':
        navigation.navigate('Chat' as any, { 
          recipientId: notification.fromUserId,
          recipientName: notification.fromUserName
        });
        break;
      case 'event_registration':
      case 'event_cancel':
        if (notification.eventId) {
          navigation.navigate('EventDetail', { eventId: notification.eventId });
        }
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllSocialNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = ({ item }: { item: SocialNotification }) => {
    const avatarUrl = item.fromUserPhoto || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fromUserName || 'U')}&background=a3e635&color=0a0a0a`;
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
      >
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => navigation.navigate('UserGrid', { 
            userId: item.fromUserId, 
            userName: item.fromUserName 
          })}
        >
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: getNotificationColor(item.type) },
            ]}
          >
            <Ionicons
              name={getNotificationIcon(item.type) as any}
              size={12}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            {getNotificationText(item)}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        
        {!item.isRead && <View style={styles.unreadDot} />}
        
        {item.postMedia && !item.postMedia.startsWith('file://') && (
          <Image 
            source={{ uri: item.postMedia }} 
            style={styles.postThumbnail} 
          />
        )}
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
            Você receberá notificações sobre curtidas, comentários, seguidores e muito mais aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.primary}
              colors={[COLORS.primary]} 
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  loginButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  unreadCard: {
    backgroundColor: COLORS.card,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  notificationContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  notificationText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  postThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: COLORS.card,
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootStackParamList } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { theme } from '../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ChatThread {
  id: number;
  otherUser: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export default function ChatListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  const loadThreads = async () => {
    if (!user?.id) return;
    
    try {
      const result = await api.getUserChatThreads({ userId: user.id });
      setThreads(result.threads || []);
    } catch (error) {
      console.error('Error loading chat threads:', error);
      showToast('Erro ao carregar conversas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [user?.id])
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadThreads, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadThreads();
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Handle delete thread (swipe action)
  const handleDeleteThread = async (threadId: number, otherUserName: string) => {
    Alert.alert(
      'Apagar conversa',
      `Deseja apagar a conversa com ${otherUserName}? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            // Close swipeable
            const ref = swipeableRefs.current.get(threadId);
            ref?.close();
          },
        },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteThreadForMe({ threadId, userId: user!.id });
              setThreads(prev => prev.filter(t => t.id !== threadId));
              showToast('Conversa apagada', 'success');
            } catch (error) {
              console.error('Error deleting thread:', error);
              showToast('Erro ao apagar conversa', 'error');
              const ref = swipeableRefs.current.get(threadId);
              ref?.close();
            }
          },
        },
      ]
    );
  };

  // Render right swipe actions (delete)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    threadId: number,
    otherUserName: string
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteThread(threadId, otherUserName)}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.deleteText}>Apagar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderThread = ({ item }: { item: ChatThread }) => {
    const isUnread = item.unreadCount > 0;
    const lastMessagePreview = item.lastMessage?.content 
      ? item.lastMessage.content.substring(0, 50) + (item.lastMessage.content.length > 50 ? '...' : '')
      : 'Nenhuma mensagem ainda';
    const isMyMessage = item.lastMessage?.senderId === user?.id;
    
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, item.id, item.otherUser.name)
        }
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.threadItem, isUnread && styles.threadItemUnread]}
          onPress={() => navigation.navigate('Chat', { 
            recipientId: item.otherUser.id,
            recipientName: item.otherUser.name,
            threadId: item.id,
          })}
          activeOpacity={0.7}
        >
          {/* Avatar - Toque para ir ao perfil */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('UserGrid', { userId: item.otherUser.id, userName: item.otherUser.name })}
            activeOpacity={0.7}
          >
            {item.otherUser.photoUrl ? (
              <Image source={{ uri: item.otherUser.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(item.otherUser.name)}</Text>
              </View>
            )}
            {isUnread && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
          
          {/* Content */}
          <View style={styles.threadContent}>
            <View style={styles.threadHeader}>
              <Text style={[styles.userName, isUnread && styles.userNameUnread]} numberOfLines={1}>
                {item.otherUser.name}
              </Text>
              <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                {formatTime(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.messagePreviewContainer}>
              <Text style={[styles.messagePreview, isUnread && styles.messagePreviewUnread]} numberOfLines={1}>
                {isMyMessage ? 'Você: ' : ''}{lastMessagePreview}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>Nenhuma conversa</Text>
      <Text style={styles.emptyText}>
        Você pode iniciar uma conversa com amigos que você segue e que te seguem de volta.
      </Text>
      <TouchableOpacity
        style={styles.findFriendsButton}
        onPress={() => navigation.navigate('SearchAthletes')}
      >
        <Text style={styles.findFriendsText}>Encontrar Amigos</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensagens</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={16} color="#1B5E20" />
          <Text style={styles.infoBannerText}>
            Chat disponível apenas entre amigos mútuos • Deslize para apagar
          </Text>
        </View>

        {/* Thread List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={threads}
            renderItem={renderThread}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={threads.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerRight: {
    width: 32,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight || 'rgba(139, 195, 74, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  threadItemUnread: {
    backgroundColor: 'rgba(139, 195, 74, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.background,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timeTextUnread: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  messagePreviewUnread: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  unreadCountBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.background,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 84,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  findFriendsButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findFriendsText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.background,
  },
  // Swipe delete styles
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    width: 100,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

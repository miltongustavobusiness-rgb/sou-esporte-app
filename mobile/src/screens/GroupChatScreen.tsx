import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { api } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GroupChat'>;

interface Message {
  id: number;
  content: string;
  userId: number;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
  replyTo?: {
    id: number;
    content: string;
    userName: string;
  };
}

export default function GroupChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName } = route.params;
  const { user } = useApp();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const result = await api.getGroupMessages(groupId, 50);
      setMessages(result || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user?.id) return;

    setSending(true);
    try {
      await api.sendGroupMessage(groupId, inputText.trim(), user.id, replyingTo?.id);
      setInputText('');
      setReplyingTo(null);
      loadMessages();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.userId === user?.id;
    const showDate = index === 0 || 
      new Date(item.createdAt).toDateString() !== 
      new Date(messages[index - 1]?.createdAt).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
        ]}>
          {!isOwnMessage && (
            <Image
              source={{ uri: item.user?.photoUrl || 'https://via.placeholder.com/36' }}
              style={styles.avatar}
            />
          )}
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble
          ]}>
            {!isOwnMessage && (
              <Text style={styles.senderName}>{item.user?.name || 'Usuário'}</Text>
            )}
            {item.replyTo && (
              <View style={styles.replyContainer}>
                <Text style={styles.replyName}>{item.replyTo.userName}</Text>
                <Text style={styles.replyContent} numberOfLines={1}>
                  {item.replyTo.content}
                </Text>
              </View>
            )}
            <Text style={[
              styles.messageText,
              isOwnMessage && styles.ownMessageText
            ]}>
              {item.content}
            </Text>
            <Text style={[
              styles.messageTime,
              isOwnMessage && styles.ownMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setReplyingTo(item)}
          >
            <Ionicons name="arrow-undo" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.headerSubtitle}>Chat do grupo</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySubtitle}>Seja o primeiro a enviar uma mensagem!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName}>
                Respondendo a {replyingTo.user?.name || 'Usuário'}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#0a1628" />
            ) : (
              <Ionicons name="send" size={20} color="#0a1628" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  messagesList: {
    padding: SPACING.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  replyName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyContent: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#0a1628',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(10, 22, 40, 0.6)',
  },
  replyButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  replyPreviewContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    paddingLeft: SPACING.sm,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyPreviewText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

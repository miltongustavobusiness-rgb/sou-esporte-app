import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

interface Message {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
  reactions?: {
    emoji: string;
    userId: number;
    userName?: string;
  }[];
  deletedAt?: string | null;
}

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Assédio ou bullying' },
  { key: 'inappropriate_content', label: 'Conteúdo inapropriado' },
  { key: 'fake_profile', label: 'Perfil falso' },
  { key: 'other', label: 'Outro' },
];

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { recipientId, recipientName, threadId: initialThreadId } = route.params;
  const { user } = useApp();
  const { showToast } = useToast();
  const flatListRef = useRef<FlatList>(null);
  const reportScrollRef = useRef<ScrollView>(null);
  const reportInputRef = useRef<TextInput>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [threadId, setThreadId] = useState<number | null>(initialThreadId || null);
  const [recipientPhoto, setRecipientPhoto] = useState<string | null>(null);
  
  // Safety states
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isMutualFollow, setIsMutualFollow] = useState(true);

  // Reaction states
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const isReactingRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    
    // Don't fetch while user is reacting to avoid overwriting local state
    if (isReactingRef.current) {
      console.log('[ChatScreen] Skipping fetch - user is reacting');
      return;
    }
    
    try {
      // Get or create chat thread with safety check
      const threadData = await api.getOrCreateChatThreadSafe({ 
        userId: user.id, 
        otherUserId: recipientId 
      });
      
      if (threadData?.error) {
        setChatError(threadData.error);
        setIsMutualFollow(false);
        setLoading(false);
        return;
      }
      
      if (threadData?.threadId) {
        setThreadId(threadData.threadId);
        setChatError(null);
        setIsMutualFollow(true);
        
        // Get messages with reactions
        const messagesData = await api.getChatMessagesWithDetails({ 
          threadId: threadData.threadId,
          limit: 50 
        });
        
        // Parse reactions from JSON if needed
        const parsedMessages = (messagesData || []).map((msg: any) => {
          const reactions = msg.reactions ? (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions) : [];
          return {
            ...msg,
            reactions: reactions || []
          };
        });
        
        console.log('[ChatScreen] Loaded messages with reactions:', parsedMessages.map((m: any) => ({ id: m.id, reactions: m.reactions })));
        
        setMessages(parsedMessages);
        
        // Mark messages as read
        await api.markMessagesAsRead({
          threadId: threadData.threadId,
          userId: user.id,
        });
      }
      
      // Get recipient photo
      const profileData = await api.getAthleteGridProfile(recipientId);
      if (profileData?.profile?.photoUrl) {
        setRecipientPhoto(profileData.profile.photoUrl);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Erro ao carregar mensagens', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, recipientId, showToast]);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || !user?.id || !threadId || sending) return;
    
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    
    // Optimistic update
    const tempMessage: Message = {
      id: Date.now(),
      senderId: user.id,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const result = await api.sendChatMessageSafe({
        threadId,
        senderId: user.id,
        content: text,
      });
      
      if (result?.error) {
        showToast(result.error, 'error');
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        setMessageText(text);
        return;
      }
      
      // Refresh messages
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Erro ao enviar mensagem', 'error');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Bloquear Usuário',
      `Tem certeza que deseja bloquear ${recipientName}? Vocês não poderão mais se seguir ou trocar mensagens.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.blockUser({
                blockerId: user!.id,
                blockedId: recipientId,
              });
              showToast(`${recipientName} foi bloqueado`, 'success');
              navigation.goBack();
            } catch (error) {
              showToast('Erro ao bloquear usuário', 'error');
            }
          },
        },
      ]
    );
    setShowOptionsModal(false);
  };

  const handleReport = async () => {
    if (!selectedReportReason) {
      showToast('Selecione um motivo', 'error');
      return;
    }
    
    try {
      await api.reportContent({
        reporterId: user!.id,
        reportedUserId: recipientId,
        reason: selectedReportReason,
        description: reportDescription,
      });
      showToast('Denúncia enviada. Obrigado por ajudar a manter a comunidade segura.', 'success');
      setShowReportModal(false);
      setSelectedReportReason(null);
      setReportDescription('');
    } catch (error) {
      showToast('Erro ao enviar denúncia', 'error');
    }
  };

  // Handle long press on message
  const handleMessageLongPress = (message: Message) => {
    if (message.deletedAt) return; // Don't allow actions on deleted messages
    setSelectedMessage(message);
    setShowMessageOptions(true);
  };

  // Handle reaction selection
  const handleReaction = async (emoji: string) => {
    if (!selectedMessage || !user?.id || !threadId) return;
    
    console.log('[ChatScreen] handleReaction called with emoji:', emoji, 'for message:', selectedMessage.id);
    console.log('[ChatScreen] Current reactions:', selectedMessage.reactions);
    
    // Block polling while reacting
    isReactingRef.current = true;
    
    try {
      // Check if user already reacted with this emoji
      const existingReaction = selectedMessage.reactions?.find(
        r => r.userId === user.id && r.emoji === emoji
      );
      
      // Check if user has any other reaction on this message
      const userHasOtherReaction = selectedMessage.reactions?.find(
        r => r.userId === user.id && r.emoji !== emoji
      );
      
      if (existingReaction) {
        // Same emoji - remove reaction
        await api.removeMessageReaction({
          messageId: selectedMessage.id,
          userId: user.id,
        });
        
        // Update local state - remove reaction
        setMessages(prev => prev.map(msg => {
          if (msg.id === selectedMessage.id) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(r => r.userId !== user.id)
            };
          }
          return msg;
        }));
        
        showToast('Reação removida', 'success');
      } else {
        // Different emoji or no reaction - first remove old reaction if exists, then add new
        if (userHasOtherReaction) {
          await api.removeMessageReaction({
            messageId: selectedMessage.id,
            userId: user.id,
          });
        }
        
        // Add new reaction
        await api.addMessageReaction({
          messageId: selectedMessage.id,
          userId: user.id,
          emoji,
        });
        
        // Update local state - replace any existing reaction with new one
        setMessages(prev => prev.map(msg => {
          if (msg.id === selectedMessage.id) {
            const otherReactions = (msg.reactions || []).filter(r => r.userId !== user.id);
            return {
              ...msg,
              reactions: [...otherReactions, { emoji, userId: user.id }]
            };
          }
          return msg;
        }));
        
        showToast('Reação adicionada', 'success');
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      showToast('Erro ao reagir', 'error');
    } finally {
      setShowMessageOptions(false);
      setSelectedMessage(null);
      // Wait 3 seconds before allowing fetch to ensure API has processed and next fetch gets updated data
      setTimeout(() => {
        isReactingRef.current = false;
        console.log('[ChatScreen] Reaction complete, polling resumed');
      }, 3000);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!selectedMessage || !user?.id) return;
    
    // Only allow deleting own messages
    if (selectedMessage.senderId !== user.id) {
      showToast('Você só pode apagar suas próprias mensagens', 'error');
      setShowMessageOptions(false);
      setSelectedMessage(null);
      return;
    }
    
    const messageToDelete = selectedMessage;
    
    Alert.alert(
      'Apagar mensagem',
      'Deseja apagar esta mensagem? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Immediately remove from local state
              setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
              
              // Then call API
              await api.deleteChatMessage({
                messageId: messageToDelete.id,
                userId: user.id,
              });
              
              showToast('Mensagem apagada', 'success');
            } catch (error) {
              console.error('Error deleting message:', error);
              showToast('Erro ao apagar mensagem', 'error');
              // Refresh messages to restore if API failed
              fetchMessages();
            }
          },
        },
      ]
    );
    
    setShowMessageOptions(false);
    setSelectedMessage(null);
  };

  const avatarUrl = recipientPhoto || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(recipientName)}&background=a3e635&color=0a0a0a`;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const isDeleted = !!item.deletedAt;
    
    return (
      <Pressable
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={300}
      >
        <View style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.theirMessage
        ]}>
          {!isMe && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('UserGrid', { userId: recipientId, userName: recipientName })}
              activeOpacity={0.7}
            >
              <Image source={{ uri: avatarUrl }} style={styles.messageAvatar} />
            </TouchableOpacity>
          )}
          <View>
            <View style={[
              styles.messageBubble,
              isMe ? styles.myBubble : styles.theirBubble,
              isDeleted && styles.deletedBubble
            ]}>
              <Text style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.theirMessageText,
                isDeleted && styles.deletedText
              ]}>
                {isDeleted ? 'Mensagem apagada' : item.content}
              </Text>
              <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                {new Date(item.createdAt).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
            
            {/* Reactions */}
            {item.reactions && item.reactions.length > 0 && !isDeleted && (
              <View style={[
                styles.reactionsContainer,
                isMe ? styles.myReactions : styles.theirReactions
              ]}>
                {item.reactions.map((reaction, index) => (
                  <View key={`${reaction.emoji}-${reaction.userId}-${index}`} style={styles.reactionBubble}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show error if chat is not available
  if (chatError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerProfile}>
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
            <Text style={styles.headerName}>{recipientName}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Chat não disponível</Text>
          <Text style={styles.errorText}>{chatError}</Text>
          <Text style={styles.errorSubtext}>
            Para trocar mensagens, vocês precisam se seguir mutuamente.
          </Text>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => navigation.navigate('UserGrid', { userId: recipientId, userName: recipientName })}
          >
            <Text style={styles.viewProfileText}>Ver Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerProfile}
          onPress={() => navigation.navigate('UserGrid', { userId: recipientId, userName: recipientName })}
        >
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{recipientName}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowOptionsModal(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Safety Banner */}
      <View style={styles.safetyBanner}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
        <Text style={styles.safetyText}>
          Chat protegido • Segure para reagir
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySubtext}>Envie uma mensagem para iniciar a conversa</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={COLORS.textMuted}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!messageText.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.background} />
          )}
        </TouchableOpacity>
      </View>

      {/* Message Options Modal */}
      <Modal
        visible={showMessageOptions}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowMessageOptions(false);
          setSelectedMessage(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowMessageOptions(false);
            setSelectedMessage(null);
          }}
        >
          <View style={styles.messageOptionsModal}>
            {/* Reaction Picker */}
            <View style={styles.reactionPickerRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionOption}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Delete Option (only for own messages) */}
            {selectedMessage?.senderId === user?.id && (
              <>
                <View style={styles.messageOptionsDivider} />
                <TouchableOpacity
                  style={styles.messageOptionItem}
                  onPress={handleDeleteMessage}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  <Text style={[styles.messageOptionText, { color: '#ef4444' }]}>Apagar</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.messageOptionItem, styles.cancelOption]}
              onPress={() => {
                setShowMessageOptions(false);
                setSelectedMessage(null);
              }}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsModal(false);
                navigation.navigate('UserGrid', { userId: recipientId, userName: recipientName });
              }}
            >
              <Ionicons name="person-outline" size={22} color={COLORS.text} />
              <Text style={styles.optionText}>Ver perfil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsModal(false);
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={22} color={COLORS.warning || '#FFA500'} />
              <Text style={[styles.optionText, { color: COLORS.warning || '#FFA500' }]}>Denunciar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleBlockUser}
            >
              <Ionicons name="ban-outline" size={22} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>Bloquear</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionItem, styles.cancelOption]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.reportModalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%' }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.reportModal}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>Denunciar</Text>
                    <TouchableOpacity onPress={() => setShowReportModal(false)}>
                      <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <View>
                    <Text style={styles.reportSubtitle}>
                      Por que você está denunciando este usuário?
                    </Text>
                    
                    {REPORT_REASONS.map((reason) => (
                      <TouchableOpacity
                        key={reason.key}
                        style={[
                          styles.reportReasonItem,
                          selectedReportReason === reason.key && styles.reportReasonSelected
                        ]}
                        onPress={() => {
                          setSelectedReportReason(reason.key);
                          if (reason.key === 'other') {
                            setTimeout(() => {
                              reportInputRef.current?.focus();
                            }, 100);
                          }
                        }}
                      >
                        <Ionicons 
                          name={selectedReportReason === reason.key ? 'radio-button-on' : 'radio-button-off'} 
                          size={20} 
                          color={selectedReportReason === reason.key ? COLORS.primary : COLORS.textMuted} 
                        />
                        <Text style={styles.reportReasonText}>{reason.label}</Text>
                      </TouchableOpacity>
                    ))}
                    
                    <TextInput
                      ref={reportInputRef}
                      style={styles.reportInput}
                      placeholder={selectedReportReason === 'other' ? 'Descreva o motivo da denúncia' : 'Detalhes adicionais (opcional)'}
                      placeholderTextColor={COLORS.textMuted}
                      value={reportDescription}
                      onChangeText={setReportDescription}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                    />
                  </View>
                  
                  <View style={styles.reportActions}>
                    <TouchableOpacity
                      style={styles.reportCancelButton}
                      onPress={() => setShowReportModal(false)}
                    >
                      <Text style={styles.reportCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.reportSubmitButton,
                        !selectedReportReason && styles.reportSubmitDisabled
                      ]}
                      onPress={handleReport}
                      disabled={!selectedReportReason}
                    >
                      <Text style={styles.reportSubmitText}>Enviar Denúncia</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SPACING.sm,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 6,
  },
  safetyText: {
    fontSize: 11,
    color: COLORS.primary,
  },
  messagesList: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: SPACING.xs,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: SPACING.sm,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    backgroundColor: COLORS.card,
    opacity: 0.6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.background,
  },
  theirMessageText: {
    color: COLORS.text,
  },
  deletedText: {
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  myReactions: {
    justifyContent: 'flex-end',
  },
  theirReactions: {
    justifyContent: 'flex-start',
  },
  reactionBubble: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  errorSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  viewProfileButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  // Message Options Modal
  messageOptionsModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  reactionOption: {
    padding: 8,
  },
  reactionOptionEmoji: {
    fontSize: 28,
  },
  messageOptionsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  messageOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  messageOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  // Options Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  cancelOption: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // Report Modal
  reportModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reportModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 34,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  reportSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  reportReasonSelected: {
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  reportReasonText: {
    fontSize: 15,
    color: COLORS.text,
  },
  reportInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reportActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  reportCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 15,
    color: COLORS.text,
  },
  reportSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.error || '#FF4444',
    alignItems: 'center',
  },
  reportSubmitDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  reportSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

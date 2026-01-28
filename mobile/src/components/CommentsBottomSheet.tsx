import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SPACING } from '../constants/theme';
import { useComments } from '../hooks/useFeed';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTime } from '../data/mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.60; // 60% da tela

interface CommentsBottomSheetProps {
  visible: boolean;
  postId: number;
  onClose: () => void;
  onCommentAdded?: () => void; // Callback para atualizar contador de comentários
  onNavigateToProfile?: (userId: number, userName: string) => void; // Callback para navegar ao perfil
}

export default function CommentsBottomSheet({ visible, postId, onClose, onCommentAdded, onNavigateToProfile }: CommentsBottomSheetProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Animation for slide up
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  
  const {
    comments,
    loading,
    error,
    refresh,
    addComment,
    deleteComment,
    toggleLikeComment,
  } = useComments(postId);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Pan responder for drag to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close if dragged down enough or fast enough
          Keyboard.dismiss();
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) return;
    
    Keyboard.dismiss();
    
    const success = await addComment(newComment.trim(), replyingTo?.id);
    if (success) {
      setNewComment('');
      setReplyingTo(null);
      showToast('Comentário adicionado!', 'success');
      // Chamar callback para atualizar contador
      if (onCommentAdded) {
        onCommentAdded();
      }
    } else {
      showToast('Erro ao adicionar comentário', 'error');
    }
  }, [newComment, replyingTo, addComment, showToast, onCommentAdded]);

  const handleReply = useCallback((commentId: number, authorName: string) => {
    setReplyingTo({ id: commentId, name: authorName });
    inputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    const success = await deleteComment(commentId);
    if (success) {
      showToast('Comentário excluído', 'success');
      if (onCommentAdded) {
        onCommentAdded();
      }
    } else {
      showToast('Erro ao excluir comentário', 'error');
    }
  }, [deleteComment, showToast, onCommentAdded]);

  const handleAvatarPress = useCallback((authorId: number, authorName: string) => {
    if (onNavigateToProfile) {
      onClose(); // Fechar o bottom sheet antes de navegar
      setTimeout(() => {
        onNavigateToProfile(authorId, authorName);
      }, 300);
    }
  }, [onNavigateToProfile, onClose]);

  const renderComment = ({ item }: { item: any }) => {
    const isOwner = user?.id === item.authorId;
    const authorAvatar = item.author?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'User')}&background=a3e635&color=0a0a0a`;
    
    return (
      <View style={[styles.commentItem, item.parentId && styles.replyItem]}>
        <TouchableOpacity 
          onPress={() => handleAvatarPress(item.authorId, item.author?.name || 'Usuário')}
          activeOpacity={0.7}
        >
          <Image source={{ uri: authorAvatar }} style={styles.commentAvatar} />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity 
              onPress={() => handleAvatarPress(item.authorId, item.author?.name || 'Usuário')}
              activeOpacity={0.7}
            >
              <Text style={styles.commentAuthor}>{item.author?.name}</Text>
            </TouchableOpacity>
            <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => toggleLikeComment(item.id)}
            >
              <Ionicons 
                name={item.isLiked ? "heart" : "heart-outline"} 
                size={14} 
                color={item.isLiked ? '#ef4444' : COLORS.textMuted} 
              />
              {item.likesCount > 0 && (
                <Text style={styles.actionText}>{item.likesCount}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleReply(item.id, item.author?.name)}
            >
              <Text style={styles.replyText}>Responder</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteComment(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const userAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=a3e635&color=0a0a0a`;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <Animated.View 
          style={[
            styles.sheet,
            { transform: [{ translateY }] }
          ]}
        >
          {/* Handle bar for drag */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comentários</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {/* Comments List */}
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>Nenhum comentário ainda</Text>
                  <Text style={styles.emptySubtext}>Seja o primeiro a comentar!</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  onScrollBeginDrag={dismissKeyboard}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
          
          {/* Input Area - Always visible above keyboard */}
          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>
                  Respondendo a <Text style={styles.replyingToName}>{replyingTo.name}</Text>
                </Text>
                <TouchableOpacity onPress={handleCancelReply}>
                  <Ionicons name="close" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <Image source={{ uri: userAvatar }} style={styles.inputAvatar} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={replyingTo ? `Responder ${replyingTo.name}...` : "Adicione um comentário..."}
                placeholderTextColor={COLORS.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSubmitComment}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={newComment.trim() ? COLORS.primary : COLORS.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  content: {
    flex: 1,
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
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  replyItem: {
    marginLeft: 40,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  replyingToText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyingToName: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

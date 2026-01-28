import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SIZES, RADIUS, SPACING } from '../constants/theme';
import { useComments } from '../hooks/useFeed';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTime } from '../data/mockData';

type RootStackParamList = {
  Comments: { postId: number };
};

type CommentsRouteProp = RouteProp<RootStackParamList, 'Comments'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CommentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CommentsRouteProp>();
  const { postId } = route.params;
  const { user } = useApp();
  const { showToast } = useToast();
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  const {
    comments,
    loading,
    error,
    refresh,
    addComment,
    deleteComment,
    toggleLikeComment,
  } = useComments(postId);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) return;
    
    // Dismiss keyboard immediately for better UX
    Keyboard.dismiss();
    
    const success = await addComment(newComment.trim(), replyingTo?.id);
    if (success) {
      setNewComment('');
      setReplyingTo(null);
      showToast('Comentário adicionado!', 'success');
    } else {
      showToast('Erro ao adicionar comentário', 'error');
    }
  }, [newComment, replyingTo, addComment, showToast]);

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
    } else {
      showToast('Erro ao excluir comentário', 'error');
    }
  }, [deleteComment, showToast]);

  const renderComment = ({ item }: { item: any }) => {
    const isOwner = user?.id === item.authorId;
    const authorAvatar = item.author?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.author?.name || 'User')}&background=a3e635&color=0a0a0a`;
    
    return (
      <View style={[styles.commentItem, item.parentId && styles.replyItem]}>
        <Image source={{ uri: authorAvatar }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.author?.name}</Text>
            <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity 
              style={styles.commentAction}
              onPress={() => toggleLikeComment(item.id)}
            >
              <Ionicons 
                name={item.isLiked ? "heart" : "heart-outline"} 
                size={14} 
                color={item.isLiked ? '#ef4444' : COLORS.textMuted} 
              />
              {item.likesCount > 0 && (
                <Text style={styles.commentActionText}>{item.likesCount}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.commentAction}
              onPress={() => handleReply(item.id, item.author?.name)}
            >
              <Text style={styles.commentActionText}>Responder</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity 
                style={styles.commentAction}
                onPress={() => handleDeleteComment(item.id)}
              >
                <Text style={[styles.commentActionText, { color: '#ef4444' }]}>Excluir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>Nenhum comentário ainda</Text>
      <Text style={styles.emptySubtext}>Seja o primeiro a comentar!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comentários</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Comments List */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderComment}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={refresh}
          />
        )}

        {/* Reply indicator */}
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Respondendo a <Text style={styles.replyName}>{replyingTo.name}</Text>
            </Text>
            <TouchableOpacity onPress={handleCancelReply}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <Image 
            source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=a3e635&color=0a0a0a` }} 
            style={styles.inputAvatar} 
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Adicione um comentário..."
            placeholderTextColor={COLORS.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyItem: {
    paddingLeft: 56,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 11,
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
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyIndicatorText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  replyName: {
    fontWeight: '600',
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

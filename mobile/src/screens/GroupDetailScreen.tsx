import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';
import { useApp } from '../contexts/AppContext';
import { useFeed } from '../hooks/useFeed';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GroupDetail'>;

type TabType = 'feed' | 'treinos' | 'ranking' | 'chat';

const { width } = Dimensions.get('window');

// Colors matching global feed
const COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  primary: '#84CC16',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
};

interface GroupData {
  id: number;
  name: string;
  description: string;
  type: string;
  coverUrl: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  memberCount: number;
  city: string;
  state: string;
  neighborhood: string;
  visibility: string;
  privacy: string;
  rules: string;
  requiresApproval: boolean;
  ownerId: number;
  createdAt: string;
}

interface MembershipData {
  role: 'owner' | 'admin' | 'moderator' | 'member';
  canCreateTraining: boolean;
  status: string;
}

interface Message {
  id: number;
  content: string;
  imageUrl?: string;
  senderId: number;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    username: string;
    photoUrl: string | null;
  };
  replyTo?: {
    id: number;
    content: string;
    senderName: string;
  };
}

const MODALITY_ICONS: Record<string, { icon: string; color: string }> = {
  corrida: { icon: 'walk-outline', color: '#2196F3' },
  running: { icon: 'walk-outline', color: '#2196F3' },
  triathlon: { icon: 'bicycle-outline', color: '#FF5722' },
  bike: { icon: 'bicycle-outline', color: '#4CAF50' },
  cycling: { icon: 'bicycle-outline', color: '#4CAF50' },
  natacao: { icon: 'water-outline', color: '#00BCD4' },
  swimming: { icon: 'water-outline', color: '#00BCD4' },
  funcional: { icon: 'barbell-outline', color: '#FF5722' },
  fitness: { icon: 'barbell-outline', color: '#FF5722' },
  caminhada_trail: { icon: 'trail-sign-outline', color: '#4CAF50' },
  trail: { icon: 'trail-sign-outline', color: '#4CAF50' },
  yoga: { icon: 'body-outline', color: '#9C27B0' },
  lutas: { icon: 'hand-left-outline', color: '#F44336' },
  outro: { icon: 'fitness-outline', color: '#607D8B' },
  other: { icon: 'fitness-outline', color: '#607D8B' },
};

const TRAINING_TYPE_SCREENS: Record<string, string> = {
  corrida: 'CreateTraining',
  triathlon: 'CreateTraining',
  bike: 'CreateTraining',
  natacao: 'CreateTraining',
  funcional: 'CreateFunctionalTraining',
  caminhada_trail: 'CreateHike',
  yoga: 'CreateYogaSession',
  lutas: 'CreateFightTraining',
  crossfit: 'CreateFunctionalTraining',
  musculacao: 'CreateFunctionalTraining',
};

// Format relative time like global feed
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// Format time for chat
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName, isAdmin } = route.params || { 
    groupId: 0, 
    groupName: 'Grupo',
    isAdmin: false,
  };
  const { user } = useApp();
  const flatListRef = useRef<FlatList>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [group, setGroup] = useState<GroupData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Use the useFeed hook for group feed - same as global feed
  const {
    posts,
    loading: feedLoading,
    refreshing: feedRefreshing,
    refresh: refreshFeed,
    toggleLike,
    toggleSave,
    sharePost,
    deletePost,
  } = useFeed(groupId);
  
  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Post options modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'admin';
  const canCreateTraining = canManage || membership?.canCreateTraining;

  // Get modality info
  const groupType = group?.type || group?.groupType || 'corrida';
  const modalityInfo = MODALITY_ICONS[groupType] || MODALITY_ICONS.outro;

  // Tabs configuration
  const tabs = [
    { id: 'feed' as TabType, label: 'Feed', icon: 'newspaper-outline' },
    { id: 'treinos' as TabType, label: 'Treinos', icon: 'fitness-outline' },
    { id: 'ranking' as TabType, label: 'Ranking', icon: 'trophy-outline' },
    { id: 'chat' as TabType, label: 'Chat', icon: 'chatbubbles-outline' },
  ];

  const loadGroupData = useCallback(async () => {
    if (!user?.id) return;
    try {
      console.log('[GroupDetailScreen] Loading group data for groupId:', groupId);
      const result = await apiRequest('getGroup', { 
        userId: user.id,
        groupId 
      }, 'query');
      console.log('[GroupDetailScreen] Group data loaded:', result);
      setGroup(result);
      setMembership(result.membership);
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do grupo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, user?.id]);

  const loadTrainings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await apiRequest('getTrainings', { 
        userId: user.id,
        groupId 
      }, 'query');
      setTrainings(result || []);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  }, [groupId, user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      setChatLoading(true);
      const result = await apiRequest('getGroupMessages', { 
        userId: user.id,
        groupId, 
        limit: 50 
      }, 'query');
      setMessages(result || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setChatLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    loadGroupData();
    loadTrainings();
  }, [loadGroupData, loadTrainings]);

  // Load chat messages when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadMessages]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    loadTrainings();
    refreshFeed();
    if (activeTab === 'chat') {
      loadMessages();
    }
  };

  const handleCreateTraining = (type: string) => {
    setShowTrainingModal(false);
    const screenName = TRAINING_TYPE_SCREENS[type] || 'CreateTraining';
    navigation.navigate(screenName as any, { 
      groupId, 
      groupName: group?.name || groupName,
      groupType: group?.type,
    });
  };

  const handleNavigateToMembers = () => {
    navigation.navigate('ManageMembers', {
      groupId,
      groupName: group?.name || groupName,
      userRole: membership?.role || 'member',
    });
  };

  const handleNavigateToRanking = () => {
    navigation.navigate('GroupRanking', {
      groupId,
      groupName: group?.name || groupName,
      groupType: group?.type || 'corrida',
    });
  };

  const handleJoinTraining = async (trainingId: number, trainingType: string) => {
    try {
      await apiRequest('groups.joinTraining', { 
        trainingId, 
        trainingType,
        response: 'going' 
      });
      Alert.alert('Sucesso', 'Você confirmou presença no treino!');
      loadTrainings();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao confirmar presença');
    }
  };

  const handleLeaveGroup = () => {
    if (membership?.role === 'owner') {
      Alert.alert('Erro', 'O dono do grupo não pode sair. Transfira a propriedade primeiro.');
      return;
    }

    Alert.alert(
      'Sair do Grupo',
      'Tem certeza que deseja sair deste grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('groups.leave', { groupId });
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao sair do grupo');
            }
          },
        },
      ]
    );
  };

  const handleCreatePost = () => {
    navigation.navigate('CreatePost' as any, { 
      groupId, 
      groupName: group?.name || groupName 
    });
  };

  // Post interaction handlers - same as global feed
  const handleLikePress = useCallback((postId: number) => {
    toggleLike(postId);
  }, [toggleLike]);

  const handleSavePress = useCallback((postId: number) => {
    toggleSave(postId);
  }, [toggleSave]);

  const handleCommentPress = useCallback((postId: number) => {
    navigation.navigate('Comments' as any, { postId });
  }, [navigation]);

  const handleSharePress = useCallback(async (post: any) => {
    setSelectedPost(post);
    setShowShareModal(true);
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!selectedPost) return;
    try {
      await Share.share({
        message: `${selectedPost.content || ''}\n\nCompartilhado via Sou Esporte`,
        title: 'Compartilhar post',
      });
      await sharePost(selectedPost.id);
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [selectedPost, sharePost]);

  const handlePostOptions = useCallback((post: any) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
  }, []);

  const handleDeletePost = useCallback(async () => {
    if (!selectedPost) return;
    setShowOptionsModal(false);
    
    Alert.alert(
      'Excluir post',
      'Tem certeza que deseja excluir este post?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(selectedPost.id);
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao excluir post');
            }
          },
        },
      ]
    );
  }, [selectedPost, deletePost]);

  const handleLikesCountPress = useCallback((postId: number) => {
    navigation.navigate('PostLikes' as any, { postId });
  }, [navigation]);

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    try {
      await apiRequest('sendGroupMessage', {
        userId: user?.id,
        groupId,
        content: inputText.trim(),
        replyToId: replyingTo?.id,
      });
      setInputText('');
      setReplyingTo(null);
      loadMessages();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  // Render Feed Tab - Same as global feed
  const renderFeedTab = () => {
    if (feedLoading && posts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nenhuma publicação ainda</Text>
          <Text style={styles.emptyText}>Seja o primeiro a postar!</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {posts.map((post) => {
          const isLiked = post.isLiked || false;
          const isSaved = post.isSaved || false;
          const totalReactions = post.likesCount || 0;

          return (
            <View key={post.id} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity 
                  style={styles.postAuthorSection}
                  onPress={() => navigation.navigate('UserProfile' as any, { userId: post.authorId })}
                >
                  <Image
                    source={{ uri: post.author?.photoUrl || 'https://via.placeholder.com/40' }}
                    style={styles.postAvatar}
                  />
                  <View style={styles.postHeaderInfo}>
                    <Text style={styles.postAuthorName}>{post.author?.name || 'Usuário'}</Text>
                    <Text style={styles.postTime}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.postMoreButton}
                  onPress={() => handlePostOptions(post)}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Post Content */}
              {post.content && (
                <Text style={styles.postContent}>{post.content}</Text>
              )}

              {/* Post Video */}
              {post.videoUrl && (
                <TouchableOpacity 
                  style={styles.postVideoContainer}
                  onPress={() => navigation.navigate('PostDetail' as any, { postId: post.id })}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: post.thumbnailUrl || post.imageUrl || post.videoUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  <View style={styles.videoPlayOverlay}>
                    <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.9)" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Post Image (only if no video) */}
              {!post.videoUrl && post.imageUrl && (
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {/* Engagement Bar - Same as global feed */}
              <View style={styles.engagementBar}>
                <View style={styles.engagementLeft}>
                  {/* Like Button */}
                  <TouchableOpacity 
                    style={styles.engagementBtn}
                    onPress={() => handleLikePress(post.id)}
                  >
                    <Ionicons 
                      name={isLiked ? "heart" : "heart-outline"} 
                      size={22} 
                      color={isLiked ? '#ef4444' : COLORS.text} 
                    />
                    {totalReactions > 0 && (
                      <Text style={styles.engagementCount}>{totalReactions}</Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* Comment Button */}
                  <TouchableOpacity 
                    style={styles.engagementBtn}
                    onPress={() => handleCommentPress(post.id)}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.text} />
                    {post.commentsCount > 0 && (
                      <Text style={styles.engagementCount}>{post.commentsCount}</Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* Share Button */}
                  <TouchableOpacity 
                    style={styles.engagementBtn}
                    onPress={() => handleSharePress(post)}
                  >
                    <Ionicons name="paper-plane-outline" size={20} color={COLORS.text} />
                    {(post.sharesCount || 0) > 0 && (
                      <Text style={styles.engagementCount}>{post.sharesCount}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* Save Button */}
                <TouchableOpacity 
                  style={styles.engagementBtn}
                  onPress={() => handleSavePress(post.id)}
                >
                  <Ionicons 
                    name={isSaved ? "bookmark" : "bookmark-outline"} 
                    size={20} 
                    color={isSaved ? COLORS.primary : COLORS.text} 
                  />
                </TouchableOpacity>
              </View>

              {/* Quem curtiu? - Same as global feed */}
              <TouchableOpacity 
                onPress={() => handleLikesCountPress(post.id)} 
                style={styles.quemCurtiuContainer}
              >
                <Text style={styles.quemCurtiuText}>Quem curtiu?</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  // Render Trainings Tab
  const renderTrainingsTab = () => (
    <View style={styles.tabContent}>
      {canCreateTraining && (
        <TouchableOpacity 
          style={styles.createTrainingButton}
          onPress={() => setShowTrainingModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          <Text style={styles.createTrainingText}>Criar Novo Treino</Text>
        </TouchableOpacity>
      )}

      {trainings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum treino agendado</Text>
          <Text style={styles.emptyText}>
            {canCreateTraining 
              ? 'Crie o primeiro treino do grupo!' 
              : 'Aguarde o admin criar um treino'}
          </Text>
        </View>
      ) : (
        trainings.map((treino) => (
          <View key={`${treino.type}-${treino.id}`} style={styles.treinoCard}>
            <View style={styles.treinoHeader}>
              <View style={[styles.treinoIcon, { backgroundColor: modalityInfo.color + '20' }]}>
                <Ionicons name={modalityInfo.icon as any} size={24} color={modalityInfo.color} />
              </View>
              <View style={styles.treinoInfo}>
                <Text style={styles.treinoTitle}>{treino.title}</Text>
                <Text style={styles.treinoDate}>
                  {new Date(treino.scheduledAt).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.treinoParticipants}>
                <Ionicons name="people" size={16} color={COLORS.textSecondary} />
                <Text style={styles.treinoParticipantsText}>
                  {treino.goingCount || 0}
                  {treino.maxParticipants ? `/${treino.maxParticipants}` : ''}
                </Text>
              </View>
            </View>
            
            {treino.meetingPoint && (
              <View style={styles.treinoLocation}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.treinoLocationText}>{treino.meetingPoint}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.participarButton}
              onPress={() => handleJoinTraining(treino.id, treino.type)}
            >
              <Text style={styles.participarButtonText}>Confirmar Presença</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  // Render Ranking Tab
  const renderRankingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.rankingCard}>
        <View style={styles.rankingHeader}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.rankingTitle}>Ranking do Grupo</Text>
        </View>
        <Text style={styles.rankingText}>
          Veja quem são os atletas mais ativos do grupo!
        </Text>
        <TouchableOpacity 
          style={styles.rankingButton}
          onPress={handleNavigateToRanking}
        >
          <Text style={styles.rankingButtonText}>Ver Ranking Completo</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Chat Tab
  const renderChatTab = () => {
    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
      const isOwnMessage = item.senderId === user?.id;
      const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
      
      return (
        <View style={[
          styles.messageContainer,
          isOwnMessage && styles.ownMessageContainer
        ]}>
          {!isOwnMessage && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <Image
                  source={{ uri: item.sender.photoUrl || 'https://via.placeholder.com/36' }}
                  style={styles.chatAvatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
          ]}>
            {!isOwnMessage && showAvatar && (
              <Text style={styles.senderName}>{item.sender.name}</Text>
            )}
            
            {item.replyTo && (
              <View style={styles.replyContainer}>
                <Text style={styles.replyName}>{item.replyTo.senderName}</Text>
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
            
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
              />
            )}
            
            <Text style={[
              styles.messageTime,
              isOwnMessage && styles.ownMessageTime
            ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          
          {!isOwnMessage && (
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => setReplyingTo(item)}
            >
              <Ionicons name="arrow-undo-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      );
    };

    return (
      <KeyboardAvoidingView
        style={styles.chatTabContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {chatLoading ? (
          <View style={styles.chatLoadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Nenhuma mensagem ainda</Text>
                <Text style={styles.emptyText}>Seja o primeiro a enviar uma mensagem!</Text>
              </View>
            }
          />
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName}>
                Respondendo a {replyingTo.sender.name}
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

        {/* Input Area */}
        <View style={styles.chatInputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.chatInput}
            placeholder="Digite uma mensagem..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            placeholderTextColor={COLORS.textMuted}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return renderFeedTab();
      case 'treinos':
        return renderTrainingsTab();
      case 'ranking':
        return renderRankingTab();
      case 'chat':
        return renderChatTab();
      default:
        return renderFeedTab();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const memberCount = Math.max(group?.memberCount || 0, 1);
  const coverImage = group?.coverUrl || group?.coverImageUrl;
  const headerHeight = width / 2; // Height = half of screen width

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Full-Width Cover Image */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={coverImage ? { uri: coverImage } : undefined}
          style={[styles.headerBackground, { height: headerHeight }]}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay}>
            {/* Top Bar with Back, Settings, Menu */}
            <View style={styles.headerTopBar}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.headerIconButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              {/* Sou Esporte Logo - Large and Centered */}
              <Image
                source={require('../assets/logo-sou-esporte.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              
              <View style={styles.headerRightButtons}>
                {canManage && (
                  <TouchableOpacity 
                    style={styles.headerIconButton}
                    onPress={() => navigation.navigate('EditGroup', { groupId, groupName: group?.name || groupName })}
                  >
                    <Ionicons name="settings-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.headerIconButton}
                  onPress={() => setShowOptionsMenu(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Group Info - Bottom of header */}
            <View style={styles.headerGroupInfo}>
              <View style={styles.groupNameContainer}>
                <Text style={styles.headerGroupLabel}>GRUPO:</Text>
                <Text style={styles.headerGroupName} numberOfLines={2}>
                  {group?.name || groupName}
                </Text>
                <View style={styles.headerGroupMeta}>
                  <Ionicons name={modalityInfo.icon as any} size={14} color={modalityInfo.color} />
                  <Text style={styles.headerGroupLocation}>
                    {group?.city}{group?.state ? `, ${group.state}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Quick Actions - Only Members with counter */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.membersButton}
          onPress={handleNavigateToMembers}
        >
          <View style={styles.membersIconContainer}>
            <Ionicons name="people" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.membersInfo}>
            <Text style={styles.membersLabel}>Membros</Text>
            <Text style={styles.membersCount}>{memberCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Fixed Tab Bar */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        renderTabContent()
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || feedRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {renderTabContent()}

          {membership && membership.role !== 'owner' && (
            <TouchableOpacity 
              style={styles.leaveButton}
              onPress={handleLeaveGroup}
            >
              <Ionicons name="exit-outline" size={20} color="#ef4444" />
              <Text style={styles.leaveButtonText}>Sair do Grupo</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Create Post FAB */}
      {activeTab === 'feed' && (
        <TouchableOpacity 
          style={styles.createPostFab}
          onPress={handleCreatePost}
        >
          <Ionicons name="add" size={28} color="#0F172A" />
        </TouchableOpacity>
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsModalContent}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                // Share group
                Share.share({
                  message: `Confira o grupo ${group?.name} no Sou Esporte!`,
                  title: 'Compartilhar grupo',
                });
              }}
            >
              <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Compartilhar grupo</Text>
            </TouchableOpacity>
            
            {membership && membership.role !== 'owner' && (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  handleLeaveGroup();
                }}
              >
                <Ionicons name="exit-outline" size={24} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>Sair do grupo</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Ionicons name="close-outline" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModalContent}>
            {selectedPost?.authorId === user?.id && (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <Text style={[styles.optionText, { color: '#ef4444' }]}>Excluir post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsModal(false);
                // Navigate to report
              }}
            >
              <Ionicons name="flag-outline" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Denunciar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => setShowOptionsModal(false)}
            >
              <Ionicons name="close-outline" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <View style={styles.shareModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Compartilhar</Text>
            
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={handleNativeShare}
            >
              <View style={styles.shareOptionIcon}>
                <Ionicons name="share-social-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.shareOptionInfo}>
                <Text style={styles.shareOptionTitle}>Compartilhar via...</Text>
                <Text style={styles.shareOptionDesc}>WhatsApp, Instagram, etc.</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelModalButton}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Training Modal */}
      <Modal
        visible={showTrainingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTrainingModal(false)}
        >
          <View style={styles.trainingModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Criar Treino</Text>
            <Text style={styles.modalSubtitle}>Escolha o tipo de treino</Text>

            <ScrollView style={styles.trainingOptionsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.trainingOptions}>
                {/* Corrida */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('corrida')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#2196F320' }]}>
                    <Ionicons name="walk-outline" size={28} color="#2196F3" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Corrida</Text>
                  <Text style={styles.trainingOptionDesc}>Treinos de corrida</Text>
                </TouchableOpacity>

                {/* Triathlon */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('triathlon')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#FF572220' }]}>
                    <Ionicons name="medal-outline" size={28} color="#FF5722" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Triathlon</Text>
                  <Text style={styles.trainingOptionDesc}>Natação, bike, corrida</Text>
                </TouchableOpacity>

                {/* Bike/Ciclismo */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('bike')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#4CAF5020' }]}>
                    <Ionicons name="bicycle-outline" size={28} color="#4CAF50" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Bike/Ciclismo</Text>
                  <Text style={styles.trainingOptionDesc}>Pedal e ciclismo</Text>
                </TouchableOpacity>

                {/* Natação */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('natacao')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#00BCD420' }]}>
                    <Ionicons name="water-outline" size={28} color="#00BCD4" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Natação</Text>
                  <Text style={styles.trainingOptionDesc}>Treinos na piscina</Text>
                </TouchableOpacity>

                {/* Funcional */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('funcional')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#E91E6320' }]}>
                    <Ionicons name="barbell-outline" size={28} color="#E91E63" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Funcional</Text>
                  <Text style={styles.trainingOptionDesc}>Circuitos, HIIT, força</Text>
                </TouchableOpacity>

                {/* Caminhada/Trail */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('caminhada_trail')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#8BC34A20' }]}>
                    <Ionicons name="trail-sign-outline" size={28} color="#8BC34A" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Caminhada/Trail</Text>
                  <Text style={styles.trainingOptionDesc}>Trilhas e caminhadas</Text>
                </TouchableOpacity>

                {/* Yoga */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('yoga')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#9C27B020' }]}>
                    <Ionicons name="body-outline" size={28} color="#9C27B0" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Yoga</Text>
                  <Text style={styles.trainingOptionDesc}>Sessões de yoga</Text>
                </TouchableOpacity>

                {/* Lutas */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('lutas')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#F4433620' }]}>
                    <Ionicons name="hand-left-outline" size={28} color="#F44336" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Lutas</Text>
                  <Text style={styles.trainingOptionDesc}>Artes marciais</Text>
                </TouchableOpacity>

                {/* CrossFit */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('crossfit')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#FF980020' }]}>
                    <Ionicons name="fitness-outline" size={28} color="#FF9800" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>CrossFit</Text>
                  <Text style={styles.trainingOptionDesc}>WODs e treinos intensos</Text>
                </TouchableOpacity>

                {/* Musculação */}
                <TouchableOpacity 
                  style={styles.trainingOption}
                  onPress={() => handleCreateTraining('musculacao')}
                >
                  <View style={[styles.trainingOptionIcon, { backgroundColor: '#79554820' }]}>
                    <Ionicons name="barbell" size={28} color="#795548" />
                  </View>
                  <Text style={styles.trainingOptionLabel}>Musculação</Text>
                  <Text style={styles.trainingOptionDesc}>Treinos de academia</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.cancelModalButton}
              onPress={() => setShowTrainingModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
  },
  
  // New Header Styles with Full-Width Cover Image
  headerContainer: {
    width: '100%',
  },
  headerBackground: {
    width: '100%',
    backgroundColor: COLORS.card,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerLogo: {
    width: 150,
    height: 50,
  },
  headerGroupInfo: {
    padding: 16,
    paddingBottom: 20,
  },
  groupNameContainer: {
    flex: 1,
  },
  headerGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerGroupName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerGroupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerGroupLocation: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  membersIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersInfo: {
    flex: 1,
    marginLeft: 12,
  },
  membersLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  membersCount: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Post Card - Same as global feed
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postAuthorSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderInfo: {
    marginLeft: 12,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  postMoreButton: {
    padding: 8,
  },
  postContent: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.border,
  },
  postVideoContainer: {
    position: 'relative',
    width: '100%',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  
  // Engagement Bar - Same as global feed
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  quemCurtiuContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quemCurtiuText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  
  // Create Training Button
  createTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  createTrainingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Treino Card
  treinoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  treinoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treinoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treinoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  treinoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  treinoDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  treinoParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  treinoParticipantsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  treinoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  treinoLocationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  participarButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  participarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  
  // Ranking Card
  rankingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  rankingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  rankingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  rankingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Chat Styles
  chatTabContainer: {
    flex: 1,
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 36,
    marginRight: 8,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.background,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(0,0,0,0.5)',
  },
  replyButton: {
    padding: 8,
    marginLeft: 4,
  },
  replyContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 4,
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
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyPreviewContent: {
    flex: 1,
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
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  
  // Leave Button
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  
  // Create Post FAB
  createPostFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Options Modal
  optionsModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  
  // Share Modal
  shareModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  shareOptionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  
  // Training Modal
  trainingModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  trainingOptionsScroll: {
    maxHeight: 400,
  },
  trainingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  trainingOption: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  trainingOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trainingOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  trainingOptionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  cancelModalButton: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

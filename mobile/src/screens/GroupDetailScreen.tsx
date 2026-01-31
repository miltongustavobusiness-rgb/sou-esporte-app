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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'GroupDetail'>;

type TabType = 'feed' | 'treinos' | 'ranking' | 'chat';

const { width } = Dimensions.get('window');

interface GroupData {
  id: number;
  name: string;
  description: string;
  type: string;
  coverImageUrl: string | null;
  memberCount: number;
  city: string;
  neighborhood: string;
  visibility: string;
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
  triathlon: { icon: 'bicycle-outline', color: '#FF5722' },
  bike: { icon: 'bicycle-outline', color: '#4CAF50' },
  natacao: { icon: 'water-outline', color: '#00BCD4' },
  funcional: { icon: 'barbell-outline', color: '#FF5722' },
  caminhada_trail: { icon: 'trail-sign-outline', color: '#4CAF50' },
  yoga: { icon: 'body-outline', color: '#9C27B0' },
  lutas: { icon: 'hand-left-outline', color: '#F44336' },
  outro: { icon: 'fitness-outline', color: '#607D8B' },
};

const TRAINING_TYPE_SCREENS: Record<string, string> = {
  funcional: 'CreateFunctionalTraining',
  caminhada_trail: 'CreateHike',
  yoga: 'CreateYogaSession',
  lutas: 'CreateFightTraining',
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
  const [posts, setPosts] = useState<any[]>([]);
  
  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const canManage = membership?.role === 'owner' || membership?.role === 'admin';
  const canCreateTraining = canManage || membership?.canCreateTraining;

  const loadGroupData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Use mobile route 'getGroup' which returns both group and membership
      const result = await apiRequest('getGroup', { 
        userId: user.id,
        groupId 
      }, 'query');
      setGroup(result);
      setMembership(result.membership);
    } catch (error) {
      console.error('Error loading group:', error);
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

  const loadPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Use getGroupPosts route for group feed
      const result = await apiRequest('getGroupPosts', { 
        userId: user.id,
        groupId,
        limit: 20,
        offset: 0,
      }, 'query');
      setPosts(result || []);
    } catch (error) {
      console.error('Error loading posts:', error);
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
    loadPosts();
  }, [loadGroupData, loadTrainings, loadPosts]);

  // Load chat messages when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadMessages]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    loadTrainings();
    loadPosts();
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
    // Navigate to create post screen
    navigation.navigate('CreatePost' as any, { 
      groupId, 
      groupName: group?.name || groupName 
    });
  };

  // Chat functions
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !user?.id) return;

    setSending(true);
    try {
      await apiRequest('sendGroupMessage', {
        userId: user.id,
        groupId,
        content: inputText.trim(),
        replyToId: replyingTo?.id,
      });
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
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  };

  const modalityInfo = MODALITY_ICONS[group?.type || 'outro'] || MODALITY_ICONS.outro;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'feed', label: 'Feed', icon: 'newspaper-outline' },
    { id: 'treinos', label: 'Treinos', icon: 'fitness-outline' },
    { id: 'ranking', label: 'Ranking', icon: 'trophy-outline' },
    { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  ];

  // Render Feed Tab
  const renderFeedTab = () => (
    <View style={styles.tabContent}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color="#64748b" />
          <Text style={styles.emptyTitle}>Nenhum post ainda</Text>
          <Text style={styles.emptyText}>Seja o primeiro a compartilhar algo!</Text>
        </View>
      ) : (
        posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image
                source={{ uri: post.author?.photoUrl || 'https://via.placeholder.com/40' }}
                style={styles.authorAvatar}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author?.name}</Text>
                <Text style={styles.postTime}>{post.timeAgo}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="heart-outline" size={20} color="#94a3b8" />
                <Text style={styles.postActionText}>{post.likesCount || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
                <Text style={styles.postActionText}>{post.commentsCount || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // Render Trainings Tab
  const renderTrainingsTab = () => (
    <View style={styles.tabContent}>
      {canCreateTraining && (
        <TouchableOpacity 
          style={styles.createTrainingButton}
          onPress={() => setShowTrainingModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#84CC16" />
          <Text style={styles.createTrainingText}>Criar Novo Treino</Text>
        </TouchableOpacity>
      )}

      {trainings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color="#64748b" />
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
                <Ionicons name="people" size={16} color="#94a3b8" />
                <Text style={styles.treinoParticipantsText}>
                  {treino.goingCount || 0}
                  {treino.maxParticipants ? `/${treino.maxParticipants}` : ''}
                </Text>
              </View>
            </View>
            
            {treino.meetingPoint && (
              <View style={styles.treinoLocation}>
                <Ionicons name="location-outline" size={16} color="#94a3b8" />
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
      <TouchableOpacity 
        style={styles.rankingCard}
        onPress={handleNavigateToRanking}
      >
        <View style={styles.rankingHeader}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.rankingTitle}>Ranking do Grupo</Text>
        </View>
        <Text style={styles.rankingText}>
          Veja quem são os membros mais ativos e conquiste seu lugar no pódio!
        </Text>
        <View style={styles.rankingButton}>
          <Text style={styles.rankingButtonText}>Ver Ranking Completo</Text>
          <Ionicons name="chevron-forward" size={20} color="#84CC16" />
        </View>
      </TouchableOpacity>
    </View>
  );

  // Render Chat Tab - Direct chat without "Open Chat" button
  const renderChatTab = () => {
    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
      const isOwnMessage = item.senderId === user?.id;
      const showAvatar = !isOwnMessage && (
        index === 0 || 
        messages[index - 1]?.senderId !== item.senderId
      );

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
              <Ionicons name="arrow-undo-outline" size={16} color="#64748b" />
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
            <ActivityIndicator size="large" color="#84CC16" />
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
                <Ionicons name="chatbubbles-outline" size={48} color="#64748b" />
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
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.chatInputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color="#94a3b8" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.chatInput}
            placeholder="Digite uma mensagem..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            placeholderTextColor="#64748b"
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
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
          <ActivityIndicator size="large" color="#84CC16" />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate actual member count (at least 1 for the owner)
  const memberCount = Math.max(group?.memberCount || 0, 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#84CC16" />
        </TouchableOpacity>
        
        {/* Logo */}
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name || groupName}
          </Text>
          <View style={styles.headerMeta}>
            <Ionicons name={modalityInfo.icon as any} size={14} color={modalityInfo.color} />
            <Text style={styles.headerSubtitle}>
              {group?.city}
            </Text>
          </View>
        </View>
        
        {canManage && (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('EditGroup', { groupId, groupName: group?.name || groupName })}
          >
            <Ionicons name="settings-outline" size={22} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions - Only Members with counter */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.membersButton}
          onPress={handleNavigateToMembers}
        >
          <View style={styles.membersIconContainer}>
            <Ionicons name="people" size={22} color="#84CC16" />
          </View>
          <View style={styles.membersInfo}>
            <Text style={styles.membersLabel}>Membros</Text>
            <Text style={styles.membersCount}>{memberCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
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
              color={activeTab === tab.id ? '#84CC16' : '#64748b'}
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

      {/* Tab Content - Scrollable for non-chat tabs */}
      {activeTab === 'chat' ? (
        renderTabContent()
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#84CC16']}
              tintColor="#84CC16"
            />
          }
        >
          {/* Cover Image */}
          {group?.coverImageUrl && (
            <Image
              source={{ uri: group.coverImageUrl }}
              style={styles.coverImage}
            />
          )}

          {/* Tab Content */}
          {renderTabContent()}

          {/* Leave Group Button */}
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

      {/* Create Post FAB - Only visible on Feed tab */}
      {activeTab === 'feed' && (
        <TouchableOpacity 
          style={styles.createPostFab}
          onPress={handleCreatePost}
        >
          <Ionicons name="add" size={28} color="#0F172A" />
        </TouchableOpacity>
      )}

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

            <View style={styles.trainingOptions}>
              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('funcional')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#FF572220' }]}>
                  <Ionicons name="barbell-outline" size={28} color="#FF5722" />
                </View>
                <Text style={styles.trainingOptionLabel}>Funcional</Text>
                <Text style={styles.trainingOptionDesc}>Circuitos, HIIT, força</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('caminhada_trail')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#4CAF5020' }]}>
                  <Ionicons name="trail-sign-outline" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.trainingOptionLabel}>Caminhada/Trail</Text>
                <Text style={styles.trainingOptionDesc}>Trilhas e caminhadas</Text>
              </TouchableOpacity>

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

              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('lutas')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#F4433620' }]}>
                  <Ionicons name="hand-left-outline" size={28} color="#F44336" />
                </View>
                <Text style={styles.trainingOptionLabel}>Lutas</Text>
                <Text style={styles.trainingOptionDesc}>Artes marciais, sparring</Text>
              </TouchableOpacity>
            </View>

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
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 4,
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginLeft: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  menuButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
    marginRight: 8,
  },
  
  // Quick Actions - Only Members
  quickActionsContainer: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  membersIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#84CC1620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersInfo: {
    flex: 1,
    marginLeft: 12,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  membersCount: {
    fontSize: 13,
    color: '#84CC16',
    fontWeight: '700',
    marginTop: 2,
  },
  
  // Fixed Tab Bar
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#84CC16',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#84CC16',
  },
  
  content: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#334155',
  },
  tabContent: {
    padding: 16,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Post Card
  postCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  postTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#334155',
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 20,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  
  // Create Training Button
  createTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84CC1615',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#84CC16',
    borderStyle: 'dashed',
    gap: 8,
  },
  createTrainingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#84CC16',
  },
  
  // Treino Card
  treinoCard: {
    backgroundColor: '#1E293B',
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
    color: '#F8FAFC',
  },
  treinoDate: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  treinoParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  treinoParticipantsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  treinoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  treinoLocationText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  participarButton: {
    backgroundColor: '#84CC16',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  participarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  
  // Ranking Card - No translucent background
  rankingCard: {
    backgroundColor: '#1E293B',
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
    color: '#F8FAFC',
  },
  rankingText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  rankingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#84CC16',
  },
  
  // Chat Tab Styles
  chatTabContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
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
    backgroundColor: '#334155',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#84CC16',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#84CC16',
    marginBottom: 4,
  },
  replyContainer: {
    backgroundColor: '#0F172A40',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#84CC16',
  },
  replyName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#84CC16',
  },
  replyContent: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#0F172A',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  messageTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: '#0F172A80',
  },
  replyButton: {
    padding: 8,
    marginLeft: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  replyPreviewContent: {
    flex: 1,
    marginRight: 12,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#84CC16',
  },
  replyPreviewText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#F8FAFC',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  
  // Create Post FAB
  createPostFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  
  // Leave Button
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  trainingModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  trainingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  trainingOption: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
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
    color: '#F8FAFC',
  },
  trainingOptionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  cancelModalButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

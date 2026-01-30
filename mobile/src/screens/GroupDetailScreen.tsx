import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

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
  
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [group, setGroup] = useState<GroupData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const canManage = membership?.role === 'owner' || membership?.role === 'admin';
  const canCreateTraining = canManage || membership?.canCreateTraining;

  const loadGroupData = useCallback(async () => {
    try {
      const [groupResult, membershipResult] = await Promise.all([
        apiRequest('groups.getById', { groupId }),
        apiRequest('groups.getMembership', { groupId }),
      ]);
      setGroup(groupResult);
      setMembership(membershipResult);
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  const loadTrainings = useCallback(async () => {
    try {
      const result = await apiRequest('groups.getTrainings', { groupId });
      setTrainings(result || []);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  }, [groupId]);

  const loadPosts = useCallback(async () => {
    try {
      const result = await apiRequest('groups.getPosts', { groupId });
      setPosts(result || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
    loadTrainings();
    loadPosts();
  }, [loadGroupData, loadTrainings, loadPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    loadTrainings();
    loadPosts();
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

  const handleNavigateToChat = () => {
    navigation.navigate('GroupChat', {
      groupId,
      groupName: group?.name || groupName,
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

  const modalityInfo = MODALITY_ICONS[group?.type || 'outro'] || MODALITY_ICONS.outro;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'feed', label: 'Feed', icon: 'newspaper-outline' },
    { id: 'treinos', label: 'Treinos', icon: 'fitness-outline' },
    { id: 'ranking', label: 'Ranking', icon: 'trophy-outline' },
    { id: 'chat', label: 'Chat', icon: 'chatbubbles-outline' },
  ];

  // Quick Actions for Hub
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity 
        style={styles.quickAction}
        onPress={handleNavigateToMembers}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="people" size={22} color="#2196F3" />
        </View>
        <Text style={styles.quickActionLabel}>Membros</Text>
        <Text style={styles.quickActionValue}>{group?.memberCount || 0}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={handleNavigateToRanking}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: '#FFF8E1' }]}>
          <Ionicons name="trophy" size={22} color="#FFC107" />
        </View>
        <Text style={styles.quickActionLabel}>Ranking</Text>
        <Text style={styles.quickActionValue}>Ver</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={handleNavigateToChat}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="chatbubbles" size={22} color="#4CAF50" />
        </View>
        <Text style={styles.quickActionLabel}>Chat</Text>
        <Text style={styles.quickActionValue}>Abrir</Text>
      </TouchableOpacity>

      {canCreateTraining && (
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => setShowTrainingModal(true)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="add-circle" size={22} color="#F44336" />
          </View>
          <Text style={styles.quickActionLabel}>Treino</Text>
          <Text style={styles.quickActionValue}>Criar</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render Feed Tab
  const renderFeedTab = () => (
    <View style={styles.tabContent}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color="#ccc" />
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
                <Ionicons name="heart-outline" size={20} color="#666" />
                <Text style={styles.postActionText}>{post.likesCount || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
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
          <Ionicons name="add-circle" size={24} color="#00C853" />
          <Text style={styles.createTrainingText}>Criar Novo Treino</Text>
        </TouchableOpacity>
      )}

      {trainings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color="#ccc" />
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
                <Ionicons name="people" size={16} color="#666" />
                <Text style={styles.treinoParticipantsText}>
                  {treino.goingCount || 0}
                  {treino.maxParticipants ? `/${treino.maxParticipants}` : ''}
                </Text>
              </View>
            </View>
            
            {treino.meetingPoint && (
              <View style={styles.treinoLocation}>
                <Ionicons name="location-outline" size={16} color="#666" />
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

  // Render Ranking Tab (Preview)
  const renderRankingTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={styles.rankingPreviewCard}
        onPress={handleNavigateToRanking}
      >
        <View style={styles.rankingPreviewHeader}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.rankingPreviewTitle}>Ranking do Grupo</Text>
        </View>
        <Text style={styles.rankingPreviewText}>
          Veja quem são os membros mais ativos e conquiste seu lugar no pódio!
        </Text>
        <View style={styles.rankingPreviewButton}>
          <Text style={styles.rankingPreviewButtonText}>Ver Ranking Completo</Text>
          <Ionicons name="chevron-forward" size={20} color="#00C853" />
        </View>
      </TouchableOpacity>
    </View>
  );

  // Render Chat Tab (Preview)
  const renderChatTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={styles.chatPreviewCard}
        onPress={handleNavigateToChat}
      >
        <View style={styles.chatPreviewHeader}>
          <Ionicons name="chatbubbles" size={32} color="#4CAF50" />
          <Text style={styles.chatPreviewTitle}>Chat do Grupo</Text>
        </View>
        <Text style={styles.chatPreviewText}>
          Converse com os membros do grupo em tempo real!
        </Text>
        <View style={styles.chatPreviewButton}>
          <Text style={styles.chatPreviewButtonText}>Abrir Chat</Text>
          <Ionicons name="chevron-forward" size={20} color="#00C853" />
        </View>
      </TouchableOpacity>
    </View>
  );

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
          <ActivityIndicator size="large" color="#00C853" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name || groupName}
          </Text>
          <View style={styles.headerMeta}>
            <Ionicons name={modalityInfo.icon as any} size={14} color={modalityInfo.color} />
            <Text style={styles.headerSubtitle}>
              {group?.city} • {group?.memberCount} membros
            </Text>
          </View>
        </View>
        {canManage && (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('ManageMembers', { groupId, groupName: group?.name || groupName, userRole: membership?.role || 'member' })}
          >
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#00C853']}
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

        {/* Quick Actions Hub */}
        {renderQuickActions()}

        {/* Tabs */}
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
                color={activeTab === tab.id ? '#00C853' : '#666'}
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
        {renderTabContent()}

        {/* Leave Group Button */}
        {membership && membership.role !== 'owner' && (
          <TouchableOpacity 
            style={styles.leaveButton}
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit-outline" size={20} color="#FF5252" />
            <Text style={styles.leaveButtonText}>Sair do Grupo</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="barbell-outline" size={28} color="#FF5722" />
                </View>
                <Text style={styles.trainingOptionLabel}>Funcional</Text>
                <Text style={styles.trainingOptionDesc}>Circuitos, HIIT, força</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('caminhada_trail')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="trail-sign-outline" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.trainingOptionLabel}>Caminhada/Trail</Text>
                <Text style={styles.trainingOptionDesc}>Trilhas e caminhadas</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('yoga')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="body-outline" size={28} color="#9C27B0" />
                </View>
                <Text style={styles.trainingOptionLabel}>Yoga</Text>
                <Text style={styles.trainingOptionDesc}>Sessões de yoga</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.trainingOption}
                onPress={() => handleCreateTraining('lutas')}
              >
                <View style={[styles.trainingOptionIcon, { backgroundColor: '#FFEBEE' }]}>
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  menuButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  quickActionValue: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    borderBottomColor: '#00C853',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#00C853',
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#fff',
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
    backgroundColor: '#e0e0e0',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#e0e0e0',
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 20,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    color: '#666',
  },
  createTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00C853',
    borderStyle: 'dashed',
    gap: 8,
  },
  createTrainingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00C853',
  },
  treinoCard: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  treinoDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  treinoParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  treinoParticipantsText: {
    fontSize: 13,
    color: '#666',
  },
  treinoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  treinoLocationText: {
    fontSize: 13,
    color: '#666',
  },
  participarButton: {
    backgroundColor: '#00C853',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  participarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rankingPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  rankingPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankingPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  rankingPreviewText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  rankingPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingPreviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00C853',
  },
  chatPreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  chatPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  chatPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  chatPreviewText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  chatPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatPreviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00C853',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF5252',
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5252',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  trainingModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  trainingOptionDesc: {
    fontSize: 12,
    color: '#666',
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
    color: '#666',
  },
});

import React, { useState, useCallback, useEffect } from 'react';
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
  FlatList,
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
type RouteProps = RouteProp<RootStackParamList, 'GroupDetail'>;

type TabType = 'feed' | 'treinos' | 'membros';

interface GroupData {
  id: number;
  name: string;
  description: string | null;
  groupType: string;
  coverUrl: string | null;
  logoUrl: string | null;
  memberCount: number;
  city: string | null;
  state: string | null;
  privacy: string;
  ownerId: number;
}

interface MembershipData {
  role: 'owner' | 'admin' | 'moderator' | 'member';
  canCreateTraining: boolean;
  status: string;
}

interface Member {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    name: string;
    photoUrl: string | null;
  };
}

const GROUP_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  running: { icon: 'walk', color: '#3b82f6', label: 'Corrida' },
  cycling: { icon: 'bicycle', color: '#22c55e', label: 'Ciclismo' },
  triathlon: { icon: 'medal', color: '#f59e0b', label: 'Triathlon' },
  trail: { icon: 'leaf', color: '#84cc16', label: 'Trail' },
  swimming: { icon: 'water', color: '#06b6d4', label: 'Natação' },
  fitness: { icon: 'barbell', color: '#ef4444', label: 'Funcional' },
  other: { icon: 'fitness', color: '#8b5cf6', label: 'Outro' },
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner: { label: 'Dono', color: '#fbbf24' },
  admin: { label: 'Admin', color: '#22c55e' },
  moderator: { label: 'Moderador', color: '#3b82f6' },
  member: { label: 'Membro', color: '#94a3b8' },
};

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useApp();
  const { groupId, groupName, isAdmin } = route.params || { 
    groupId: 0, 
    groupName: 'Grupo',
    isAdmin: false,
  };
  
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [group, setGroup] = useState<GroupData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  const canManage = membership?.role === 'owner' || membership?.role === 'admin';
  const canCreateTraining = canManage || membership?.canCreateTraining;
  const typeConfig = GROUP_TYPE_CONFIG[group?.groupType || 'other'] || GROUP_TYPE_CONFIG.other;

  const loadGroupData = useCallback(async () => {
    try {
      const groupResult = await api.getGroup(groupId);
      setGroup(groupResult);
      
      if (user?.id) {
        const membershipResult = await api.getGroupMembership(groupId, user.id);
        setMembership(membershipResult);
      }
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, user?.id]);

  const loadMembers = useCallback(async () => {
    try {
      const result = await api.getGroupMembers(groupId);
      setMembers(result || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, [groupId]);

  const loadTrainings = useCallback(async () => {
    try {
      const result = await api.getGroupTrainings(groupId);
      setTrainings(result || []);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  }, [groupId]);

  const loadPosts = useCallback(async () => {
    try {
      const result = await api.getGroupPosts(groupId);
      setPosts(result || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
    loadMembers();
    loadTrainings();
    loadPosts();
  }, [loadGroupData, loadMembers, loadTrainings, loadPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroupData();
    loadMembers();
    loadTrainings();
    loadPosts();
  };

  const handleNavigateToChat = () => {
    navigation.navigate('GroupChat', {
      groupId,
      groupName: group?.name || groupName,
    });
  };

  const handleNavigateToRanking = () => {
    navigation.navigate('GroupRanking', {
      groupId,
      groupName: group?.name || groupName,
      groupType: group?.groupType || 'running',
    });
  };

  const handleCreateTraining = (type: string) => {
    setShowTrainingModal(false);
    const screenMap: Record<string, keyof RootStackParamList> = {
      funcional: 'CreateFunctionalTraining',
      caminhada_trail: 'CreateHike',
      yoga: 'CreateYogaSession',
      lutas: 'CreateFightTraining',
    };
    const screenName = screenMap[type] || 'CreateTraining';
    navigation.navigate(screenName as any, { 
      groupId, 
      groupName: group?.name || groupName,
      groupType: group?.groupType,
    });
  };

  const handleJoinTraining = async (trainingId: number, trainingType: string) => {
    try {
      await api.joinGroupTraining(trainingId, trainingType, 'going');
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
              await api.leaveGroup(groupId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao sair do grupo');
            }
          },
        },
      ]
    );
  };

  const handleUpdateMemberRole = async (memberId: number, newRole: string) => {
    try {
      await api.updateGroupMember(groupId, memberId, { role: newRole });
      Alert.alert('Sucesso', 'Papel atualizado com sucesso!');
      loadMembers();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar papel');
    }
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover ${memberName} do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeGroupMember(groupId, memberId);
              Alert.alert('Sucesso', 'Membro removido!');
              loadMembers();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao remover membro');
            }
          },
        },
      ]
    );
  };

  // Render Feed Tab
  const renderFeedTab = () => (
    <View style={styles.tabContent}>
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Nenhum post ainda</Text>
          <Text style={styles.emptySubtitle}>Seja o primeiro a compartilhar algo!</Text>
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
                <Text style={styles.authorName}>{post.author?.name || 'Usuário'}</Text>
                <Text style={styles.postTime}>
                  {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
            {post.content && <Text style={styles.postContent}>{post.content}</Text>}
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="heart-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.postActionText}>{post.likesCount || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction}>
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
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
          style={styles.createButton}
          onPress={() => setShowTrainingModal(true)}
        >
          <Ionicons name="add-circle" size={22} color={COLORS.primary} />
          <Text style={styles.createButtonText}>Criar Novo Treino</Text>
        </TouchableOpacity>
      )}

      {trainings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Nenhum treino agendado</Text>
          <Text style={styles.emptySubtitle}>
            {canCreateTraining 
              ? 'Crie o primeiro treino do grupo!' 
              : 'Aguarde o admin criar um treino'}
          </Text>
        </View>
      ) : (
        trainings.map((treino) => (
          <View key={`${treino.trainingType}-${treino.id}`} style={styles.trainingCard}>
            <View style={styles.trainingHeader}>
              <View style={[styles.trainingIcon, { backgroundColor: `${typeConfig.color}20` }]}>
                <Ionicons name={typeConfig.icon as any} size={24} color={typeConfig.color} />
              </View>
              <View style={styles.trainingInfo}>
                <Text style={styles.trainingTitle}>{treino.title}</Text>
                <Text style={styles.trainingDate}>
                  {new Date(treino.scheduledAt).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            
            {treino.meetingPoint && (
              <View style={styles.trainingLocation}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.trainingLocationText}>{treino.meetingPoint}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.joinButton}
              onPress={() => handleJoinTraining(treino.id, treino.trainingType)}
            >
              <Text style={styles.joinButtonText}>Confirmar Presença</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  // Render Members Tab
  const renderMembersTab = () => (
    <View style={styles.tabContent}>
      {canManage && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('InviteMembers', { groupId, groupName: group?.name || groupName })}
        >
          <Ionicons name="person-add" size={22} color={COLORS.primary} />
          <Text style={styles.createButtonText}>Convidar Membros</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>{members.length} membros</Text>

      {members.map((member) => {
        const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
        const isCurrentUser = member.userId === user?.id;
        const canEditMember = canManage && !isCurrentUser && member.role !== 'owner';

        return (
          <View key={member.id} style={styles.memberCard}>
            <Image
              source={{ uri: member.user?.photoUrl || 'https://via.placeholder.com/48' }}
              style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.user?.name || 'Usuário'}
                {isCurrentUser && ' (você)'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: `${roleConfig.color}20` }]}>
                <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
              </View>
            </View>
            
            {canEditMember && (
              <TouchableOpacity 
                style={styles.memberAction}
                onPress={() => {
                  Alert.alert(
                    'Gerenciar Membro',
                    `O que deseja fazer com ${member.user?.name}?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: member.role === 'admin' ? 'Remover Admin' : 'Tornar Admin',
                        onPress: () => handleUpdateMemberRole(
                          member.userId, 
                          member.role === 'admin' ? 'member' : 'admin'
                        )
                      },
                      { 
                        text: 'Remover do Grupo',
                        style: 'destructive',
                        onPress: () => handleRemoveMember(member.userId, member.user?.name || 'Usuário')
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group?.name || groupName}</Text>
        <TouchableOpacity onPress={handleNavigateToChat} style={styles.chatButton}>
          <Ionicons name="chatbubbles" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Group Info Card */}
        <View style={styles.groupInfoCard}>
          <View style={styles.groupHeader}>
            {group?.logoUrl ? (
              <Image source={{ uri: group.logoUrl }} style={styles.groupLogo} />
            ) : (
              <View style={[styles.groupLogoPlaceholder, { backgroundColor: `${typeConfig.color}20` }]}>
                <Ionicons name={typeConfig.icon as any} size={32} color={typeConfig.color} />
              </View>
            )}
            <View style={styles.groupDetails}>
              <Text style={styles.groupName}>{group?.name}</Text>
              <View style={styles.groupMeta}>
                <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                <Text style={styles.groupMetaText}>{group?.memberCount || 0} membros</Text>
              </View>
              {group?.city && (
                <View style={styles.groupMeta}>
                  <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.groupMetaText}>{group.city}{group.state ? `, ${group.state}` : ''}</Text>
                </View>
              )}
            </View>
          </View>

          {group?.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleNavigateToRanking}>
              <Ionicons name="trophy" size={20} color="#fbbf24" />
              <Text style={styles.quickActionText}>Ranking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleNavigateToChat}>
              <Ionicons name="chatbubbles" size={20} color="#22c55e" />
              <Text style={styles.quickActionText}>Chat</Text>
            </TouchableOpacity>
            {membership && membership.role !== 'owner' && (
              <TouchableOpacity style={styles.quickAction} onPress={handleLeaveGroup}>
                <Ionicons name="exit" size={20} color="#ef4444" />
                <Text style={styles.quickActionText}>Sair</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['feed', 'treinos', 'membros'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'feed' ? 'Feed' : tab === 'treinos' ? 'Treinos' : 'Membros'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'feed' && renderFeedTab()}
        {activeTab === 'treinos' && renderTrainingsTab()}
        {activeTab === 'membros' && renderMembersTab()}
      </ScrollView>

      {/* Training Type Modal */}
      <Modal
        visible={showTrainingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipo de Treino</Text>
            
            {[
              { id: 'funcional', label: 'Funcional', icon: 'barbell' },
              { id: 'caminhada_trail', label: 'Caminhada/Trail', icon: 'leaf' },
              { id: 'yoga', label: 'Yoga', icon: 'body' },
              { id: 'lutas', label: 'Lutas', icon: 'hand-left' },
            ].map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.modalOption}
                onPress={() => handleCreateTraining(type.id)}
              >
                <Ionicons name={type.icon as any} size={24} color={COLORS.primary} />
                <Text style={styles.modalOptionText}>{type.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowTrainingModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfoCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLogo: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
  },
  groupLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  groupMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#0a1628',
  },
  tabContent: {
    padding: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: SPACING.sm,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    marginLeft: SPACING.sm,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  postContent: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  postActionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  trainingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  trainingDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  trainingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  trainingLocationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a1628',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberAction: {
    padding: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: SPACING.md,
  },
  modalCancel: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

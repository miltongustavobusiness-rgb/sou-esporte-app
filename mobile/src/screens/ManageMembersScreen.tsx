import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  PanResponder,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ManageMembers'>;

interface Member {
  id: number;
  userId: number;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: string;
  canCreateTraining: boolean;
  joinedAt: string;
  user: {
    id: number;
    name: string;
    username: string;
    photoUrl: string | null;
  };
}

interface SearchUser {
  id: number;
  name: string;
  username: string;
  photoUrl: string | null;
}

// Dark theme colors
const COLORS = {
  background: '#0F172A',
  card: '#1E293B',
  cardBorder: '#334155',
  primary: '#84CC16',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  danger: '#EF4444',
  overlay: 'rgba(0,0,0,0.7)',
};

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  owner: { label: 'Dono', color: '#FFD700', icon: 'star' },
  admin: { label: 'Admin', color: '#FF5722', icon: 'shield' },
  moderator: { label: 'Moderador', color: '#2196F3', icon: 'shield-checkmark' },
  member: { label: 'Membro', color: '#4CAF50', icon: 'person' },
};

export default function ManageMembersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { groupId, groupName, userRole } = route.params;
  const { user } = useApp();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Animation for bottom sheet
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const canManage = userRole === 'owner' || userRole === 'admin';

  // Animate sheet in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  }, [navigation, translateY, overlayOpacity]);

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
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const loadMembers = useCallback(async () => {
    if (!user?.id) return;
    try {
      console.log('[ManageMembersScreen] Loading members for group:', groupId, 'user:', user.id);
      const result = await apiRequest('getGroupMembers', { groupId, userId: user.id }, 'query');
      console.log('[ManageMembersScreen] Members loaded:', result?.length || 0);
      setMembers(result || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const result = await apiRequest('groups.searchUsersToInvite', { 
        groupId, 
        query 
      });
      setSearchResults(result || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleInviteUser = async (targetUser: SearchUser) => {
    try {
      await apiRequest('groups.inviteUser', {
        groupId,
        userId: targetUser.id,
      });
      Alert.alert('Sucesso', `Convite enviado para ${targetUser.name}`);
      setSearchResults(prev => prev.filter(u => u.id !== targetUser.id));
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar convite');
    }
  };

  const handleUpdateRole = async (member: Member, newRole: string) => {
    if (member.role === 'owner') {
      Alert.alert('Erro', 'Não é possível alterar o cargo do dono do grupo');
      return;
    }

    try {
      await apiRequest('groups.updateMember', {
        groupId,
        userId: member.userId,
        role: newRole,
      });
      Alert.alert('Sucesso', 'Cargo atualizado com sucesso');
      loadMembers();
      setShowMemberModal(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar cargo');
    }
  };

  const handleToggleTrainingPermission = async (member: Member) => {
    try {
      await apiRequest('groups.updateMember', {
        groupId,
        userId: member.userId,
        canCreateTraining: !member.canCreateTraining,
      });
      loadMembers();
      setShowMemberModal(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar permissão');
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.role === 'owner') {
      Alert.alert('Erro', 'Não é possível remover o dono do grupo');
      return;
    }

    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover ${member.user.name} do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('groups.removeMember', {
                groupId,
                userId: member.userId,
              });
              Alert.alert('Sucesso', 'Membro removido do grupo');
              loadMembers();
              setShowMemberModal(false);
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao remover membro');
            }
          },
        },
      ]
    );
  };

  const filteredMembers = members.filter(m => 
    m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMember = ({ item }: { item: Member }) => {
    const roleInfo = ROLE_LABELS[item.role] || ROLE_LABELS.member;

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => {
          if (canManage && item.role !== 'owner') {
            setSelectedMember(item);
            setShowMemberModal(true);
          }
        }}
        disabled={!canManage || item.role === 'owner'}
      >
        <Image
          source={{ 
            uri: item.user.photoUrl || 'https://via.placeholder.com/50' 
          }}
          style={styles.memberPhoto}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.user.name}</Text>
          <Text style={styles.memberUsername}>@{item.user.username}</Text>
          <View style={styles.memberMeta}>
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
              <Ionicons name={roleInfo.icon as any} size={12} color="#fff" />
              <Text style={styles.roleLabel}>{roleInfo.label}</Text>
            </View>
            {item.canCreateTraining && (
              <View style={styles.permissionBadge}>
                <Ionicons name="add-circle" size={12} color={COLORS.primary} />
                <Text style={styles.permissionLabel}>Cria treinos</Text>
              </View>
            )}
          </View>
        </View>
        {canManage && item.role !== 'owner' && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: SearchUser }) => (
    <View style={styles.searchResultCard}>
      <Image
        source={{ uri: item.photoUrl || 'https://via.placeholder.com/40' }}
        style={styles.searchResultPhoto}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => handleInviteUser(item)}
      >
        <Ionicons name="person-add" size={18} color="#fff" />
        <Text style={styles.inviteButtonText}>Convidar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View 
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={closeSheet}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View 
        style={[
          styles.sheet,
          { transform: [{ translateY }] }
        ]}
      >
        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Membros</Text>
            <Text style={styles.headerSubtitle}>{groupName} • {members.length} membros</Text>
          </View>
          <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Add Members Button */}
        {canManage && (
          <TouchableOpacity 
            style={styles.addMembersButton}
            onPress={() => navigation.navigate('InviteMembers', { groupId, groupName })}
          >
            <Ionicons name="person-add" size={20} color={COLORS.primary} />
            <Text style={styles.addMembersButtonText}>Adicionar Membros</Text>
          </TouchableOpacity>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar membro..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            renderItem={renderMember}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nenhum membro encontrado</Text>
              </View>
            }
          />
        )}

        {/* Member Action Modal */}
        <Modal
          visible={showMemberModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMemberModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMemberModal(false)}
          >
            <View style={styles.actionSheet}>
              {selectedMember && (
                <>
                  <View style={styles.actionSheetHeader}>
                    <Image
                      source={{ uri: selectedMember.user.photoUrl || 'https://via.placeholder.com/60' }}
                      style={styles.actionSheetPhoto}
                    />
                    <Text style={styles.actionSheetName}>{selectedMember.user.name}</Text>
                    <Text style={styles.actionSheetUsername}>@{selectedMember.user.username}</Text>
                  </View>

                  <Text style={styles.actionSectionTitle}>Alterar Cargo</Text>
                  <View style={styles.rolesGrid}>
                    {['admin', 'moderator', 'member'].map(role => {
                      const roleInfo = ROLE_LABELS[role];
                      const isSelected = selectedMember.role === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            isSelected && { backgroundColor: roleInfo.color + '30' }
                          ]}
                          onPress={() => handleUpdateRole(selectedMember, role)}
                        >
                          <Ionicons 
                            name={roleInfo.icon as any} 
                            size={20} 
                            color={isSelected ? roleInfo.color : COLORS.textMuted} 
                          />
                          <Text style={[
                            styles.roleOptionLabel,
                            isSelected && { color: roleInfo.color }
                          ]}>
                            {roleInfo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleToggleTrainingPermission(selectedMember)}
                  >
                    <Ionicons 
                      name={selectedMember.canCreateTraining ? 'checkmark-circle' : 'add-circle-outline'} 
                      size={22} 
                      color={selectedMember.canCreateTraining ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={styles.actionItemText}>
                      {selectedMember.canCreateTraining ? 'Pode criar treinos' : 'Permitir criar treinos'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionItem, styles.dangerAction]}
                    onPress={() => handleRemoveMember(selectedMember)}
                  >
                    <Ionicons name="person-remove" size={22} color={COLORS.danger} />
                    <Text style={[styles.actionItemText, { color: COLORS.danger }]}>
                      Remover do grupo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowMemberModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addMembersButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  memberPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.cardBorder,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  memberUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(132, 204, 22, 0.15)',
    gap: 4,
  },
  permissionLabel: {
    fontSize: 11,
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchResultPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBorder,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchResultUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionSheetPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.cardBorder,
  },
  actionSheetName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  actionSheetUsername: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  rolesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  roleOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 12,
  },
  actionItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  dangerAction: {
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

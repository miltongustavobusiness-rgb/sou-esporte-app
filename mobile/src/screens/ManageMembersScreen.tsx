import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiRequest } from '../config/api';

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

  const canManage = userRole === 'owner' || userRole === 'admin';

  const loadMembers = useCallback(async () => {
    try {
      const result = await apiRequest('groups.getMembers', { groupId });
      setMembers(result || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

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

  const handleInviteUser = async (user: SearchUser) => {
    try {
      await apiRequest('groups.inviteUser', {
        groupId,
        userId: user.id,
      });
      Alert.alert('Sucesso', `Convite enviado para ${user.name}`);
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
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
                <Ionicons name="add-circle" size={12} color="#00C853" />
                <Text style={styles.permissionLabel}>Cria treinos</Text>
              </View>
            )}
          </View>
        </View>
        {canManage && item.role !== 'owner' && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Membros</Text>
          <Text style={styles.headerSubtitle}>{groupName} • {members.length} membros</Text>
        </View>
        {canManage && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={22} color="#00C853" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar membro..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#00C853']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum membro encontrado</Text>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Convidar Membros</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuário por nome ou @username..."
              value={inviteSearch}
              onChangeText={(text) => {
                setInviteSearch(text);
                searchUsers(text);
              }}
              placeholderTextColor="#999"
              autoFocus
            />
          </View>

          {searchingUsers ? (
            <ActivityIndicator size="small" color="#00C853" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.searchResultsList}
              ListEmptyComponent={
                inviteSearch.length >= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Digite pelo menos 2 caracteres</Text>
                  </View>
                )
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Member Actions Modal */}
      <Modal
        visible={showMemberModal}
        animationType="slide"
        transparent
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
                    source={{ 
                      uri: selectedMember.user.photoUrl || 'https://via.placeholder.com/50' 
                    }}
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
                          isSelected && { backgroundColor: roleInfo.color }
                        ]}
                        onPress={() => handleUpdateRole(selectedMember, role)}
                      >
                        <Ionicons 
                          name={roleInfo.icon as any} 
                          size={20} 
                          color={isSelected ? '#fff' : roleInfo.color} 
                        />
                        <Text style={[
                          styles.roleOptionLabel,
                          isSelected && { color: '#fff' }
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
                    color={selectedMember.canCreateTraining ? '#00C853' : '#666'} 
                  />
                  <Text style={styles.actionItemText}>
                    {selectedMember.canCreateTraining 
                      ? 'Pode criar treinos ✓' 
                      : 'Permitir criar treinos'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.dangerAction]}
                  onPress={() => handleRemoveMember(selectedMember)}
                >
                  <Ionicons name="person-remove" size={22} color="#FF5252" />
                  <Text style={[styles.actionItemText, { color: '#FF5252' }]}>
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
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberUsername: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#f0fff4',
    gap: 4,
  },
  permissionLabel: {
    fontSize: 11,
    color: '#00C853',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultsList: {
    padding: 16,
    paddingTop: 0,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  searchResultPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  searchResultUsername: {
    fontSize: 13,
    color: '#666',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
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
    backgroundColor: '#e0e0e0',
  },
  actionSheetName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  actionSheetUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  roleOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  actionItemText: {
    fontSize: 15,
    color: '#333',
  },
  dangerAction: {
    borderTopColor: '#ffebee',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});

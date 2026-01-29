import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Group {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  memberCount?: number;
  city?: string | null;
  state?: string | null;
  groupType?: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

// Componente para badge de papel
const RoleBadge = ({ role }: { role: string }) => {
  const getConfig = () => {
    switch (role) {
      case 'owner':
        return { label: 'Dono', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)' };
      case 'admin':
        return { label: 'Admin', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)' };
      case 'moderator':
        return { label: 'Moderador', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' };
      default:
        return { label: 'Membro', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.roleBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// Componente de card do grupo
const GroupCard = ({ group, onPress }: { group: Group; onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
      {/* Imagem do grupo */}
      <View style={styles.groupImageContainer}>
        {group.logoUrl ? (
          <Image source={{ uri: group.logoUrl }} style={styles.groupImage} />
        ) : (
          <View style={styles.groupImagePlaceholder}>
            <Ionicons name="people" size={28} color={COLORS.textSecondary} />
          </View>
        )}
      </View>

      {/* Informações do grupo */}
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <RoleBadge role={group.role} />
        </View>
        
        {group.city && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{group.city}{group.state ? `, ${group.state}` : ''}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{group.memberCount || 0} membros</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

export default function MyGroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      if (!user?.id) {
        console.warn('No user logged in');
        setGroups([]);
        return;
      }
      const userGroups = await api.getUserGroups(user.id);
      setGroups(userGroups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, [loadGroups]);

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetail', {
      groupId: group.id,
      groupName: group.name,
      isAdmin: group.role === 'owner' || group.role === 'admin',
    });
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  // Separar grupos por papel
  const adminGroups = groups.filter(g => g.role === 'owner' || g.role === 'admin');
  const memberGroups = groups.filter(g => g.role === 'member' || g.role === 'moderator');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Grupos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando grupos...</Text>
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
        <Text style={styles.headerTitle}>Meus Grupos</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {groups.length === 0 ? (
        /* Estado vazio */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
          <Text style={styles.emptySubtitle}>
            Crie seu próprio grupo ou participe de grupos existentes para treinar com outros atletas!
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
            <Ionicons name="add-circle" size={22} color="#0a1628" />
            <Text style={styles.createButtonText}>Criar Meu Primeiro Grupo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Lista de grupos */
        <FlatList
          data={[{ type: 'content' }]}
          keyExtractor={() => 'content'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={() => (
            <View style={styles.content}>
              {/* Botão Criar Grupo */}
              <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
                <View style={styles.createGroupIcon}>
                  <Ionicons name="add" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.createGroupText}>Criar Novo Grupo</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              {/* Seção: Grupos que administro */}
              {adminGroups.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Grupos que administro</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{adminGroups.length}</Text>
                    </View>
                  </View>
                  {adminGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onPress={() => handleGroupPress(group)}
                    />
                  ))}
                </View>
              )}

              {/* Seção: Grupos que participo */}
              {memberGroups.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Grupos que participo</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{memberGroups.length}</Text>
                    </View>
                  </View>
                  {memberGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onPress={() => handleGroupPress(group)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* FAB - Criar Grupo */}
      {groups.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateGroup}>
          <Ionicons name="add" size={28} color="#0a1628" />
        </TouchableOpacity>
      )}
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
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SPACING.md,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  createGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(163, 230, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  createGroupText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  countBadge: {
    marginLeft: SPACING.sm,
    backgroundColor: 'rgba(163, 230, 53, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  groupImageContainer: {
    marginRight: SPACING.md,
  },
  groupImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
  },
  groupImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: SPACING.sm,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a1628',
    marginLeft: SPACING.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

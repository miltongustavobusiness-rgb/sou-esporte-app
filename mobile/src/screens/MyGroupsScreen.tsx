import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { api } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface Group {
  id: number;
  name: string;
  description?: string;
  coverImageUrl?: string | null;
  memberCount?: number;
  city?: string;
  type?: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

// Badge component for role display
const RoleBadge = ({ role }: { role: string }) => {
  const getBadgeConfig = () => {
    switch (role) {
      case 'owner':
        return { icon: 'crown', label: 'Dono', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)' };
      case 'admin':
        return { icon: 'shield', label: 'Admin', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' };
      case 'moderator':
        return { icon: 'people', label: 'Moderador', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' };
      default:
        return { icon: 'person', label: 'Membro', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// Group card component
const GroupCard = ({ group, onPress }: { group: Group; onPress: () => void }) => {
  const isAdmin = group.role === 'owner' || group.role === 'admin';

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.groupImageContainer}>
        {group.coverImageUrl ? (
          <Image source={{ uri: group.coverImageUrl }} style={styles.groupImage} />
        ) : (
          <View style={styles.groupImagePlaceholder}>
            <Ionicons name="people" size={32} color={COLORS.textSecondary} />
          </View>
        )}
        <RoleBadge role={group.role} />
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        {group.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.groupLocation} numberOfLines={1}>{group.city}</Text>
          </View>
        )}
        <View style={styles.membersRow}>
          <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.membersCount}>{group.memberCount || 0} membros</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

// Section header component
const SectionHeader = ({ title, count }: { title: string; count: number }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.countBadge}>
      <Text style={styles.countText}>{count}</Text>
    </View>
  </View>
);

export default function MyGroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const userGroups = await api.getUserGroups();
      setGroups(userGroups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    const isAdmin = group.role === 'owner' || group.role === 'admin';
    navigation.navigate('GroupDetail', {
      groupId: group.id,
      groupName: group.name,
      isAdmin,
    });
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  // Separate groups by role
  const adminGroups = groups.filter(g => g.role === 'owner' || g.role === 'admin');
  const memberGroups = groups.filter(g => g.role === 'member' || g.role === 'moderator');

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando grupos...</Text>
        </View>
      );
    }

    if (groups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
          <Text style={styles.emptySubtitle}>
            Crie seu próprio grupo ou participe de grupos existentes para treinar com outros atletas!
          </Text>
          <TouchableOpacity style={styles.createButtonLarge} onPress={handleCreateGroup}>
            <Ionicons name="add-circle" size={24} color="#0a1628" />
            <Text style={styles.createButtonLargeText}>Criar Meu Primeiro Grupo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={[{ type: 'content' }]}
        keyExtractor={() => 'content'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        renderItem={() => (
          <View style={styles.content}>
            {/* Admin Groups Section */}
            {adminGroups.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Grupos que administro" count={adminGroups.length} />
                {adminGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => handleGroupPress(group)}
                  />
                ))}
              </View>
            )}

            {/* Member Groups Section */}
            {memberGroups.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Grupos que participo" count={memberGroups.length} />
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
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Grupos</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={styles.addButton}>
          <Ionicons name="add" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderContent()}

      {/* Floating Action Button */}
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
  content: {
    padding: SPACING.md,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  groupImageContainer: {
    position: 'relative',
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
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  groupInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  groupLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membersCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
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
  createButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  createButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a1628',
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
    ...SHADOWS.large,
  },
});

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';
import { apiRequest } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_BUTTON_WIDTH = 80;

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

// Componente de card do grupo com swipe-to-delete
const SwipeableGroupCard = ({ 
  group, 
  onPress, 
  onDelete,
  canDelete 
}: { 
  group: Group; 
  onPress: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDelete,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return canDelete && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!canDelete) return;
        
        // Only allow swipe left (negative dx)
        if (gestureState.dx < 0) {
          const newValue = Math.max(gestureState.dx, -DELETE_BUTTON_WIDTH);
          translateX.setValue(newValue);
        } else if (isOpen) {
          // Allow swipe right to close
          const newValue = Math.min(gestureState.dx - DELETE_BUTTON_WIDTH, 0);
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canDelete) return;
        
        // If swiped more than half the button width, open it
        if (gestureState.dx < -DELETE_BUTTON_WIDTH / 2) {
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            friction: 8,
          }).start();
          setIsOpen(true);
        } else {
          // Close the swipe
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
          setIsOpen(false);
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsOpen(false);
  };

  const handlePress = () => {
    if (isOpen) {
      closeSwipe();
    } else {
      onPress();
    }
  };

  const handleDelete = () => {
    closeSwipe();
    onDelete();
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button behind the card */}
      {canDelete && (
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.deleteButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Swipeable card */}
      <Animated.View
        style={[
          styles.groupCardAnimated,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.groupCard} 
          onPress={handlePress} 
          activeOpacity={0.7}
        >
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
              <Text style={styles.infoText}>{group.memberCount || 1} membros</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function MyGroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      if (!user?.id) {
        console.warn('No user logged in');
        setGroups([]);
        return;
      }
      console.log('[MyGroupsScreen] Loading groups for user:', user.id);
      const userGroups = await api.getUserGroups(user.id);
      console.log('[MyGroupsScreen] Groups loaded:', userGroups?.length || 0);
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

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      'Excluir Grupo',
      `Tem certeza que deseja excluir o grupo "${group.name}"?\n\nEsta ação é IRREVERSÍVEL. Todos os dados do grupo, incluindo membros, posts, chat e treinos serão permanentemente excluídos.\n\nNão será possível recuperar o grupo após a exclusão.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir Grupo',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              
              // Call API to delete group
              await apiRequest('deleteGroup', {
                userId: user?.id,
                groupId: group.id,
              });
              
              // Remove from local state
              setGroups(prev => prev.filter(g => g.id !== group.id));
              
              Alert.alert('Sucesso', 'Grupo excluído com sucesso.');
            } catch (error: any) {
              console.error('Error deleting group:', error);
              Alert.alert('Erro', error.message || 'Não foi possível excluir o grupo. Tente novamente.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Separar grupos: Meus Grupos (owner/admin) e Grupos que Participo (member/moderator)
  const myGroups = groups.filter(g => g.role === 'owner' || g.role === 'admin');
  const participatingGroups = groups.filter(g => g.role === 'member' || g.role === 'moderator');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Logo Header */}
        <View style={styles.logoHeader}>
          <Image
            source={require('../../assets/logo-souesporte.png')}
            style={styles.logoLarge}
            resizeMode="contain"
          />
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
      {/* Logo Header - Grande e Centralizado */}
      <View style={styles.logoHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={require('../../assets/logo-souesporte.png')}
          style={styles.logoLarge}
          resizeMode="contain"
        />
        <View style={{ width: 40 }} />
      </View>

      {/* Deleting overlay */}
      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.deletingText}>Excluindo grupo...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Botão Criar Novo Grupo - No topo */}
        <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
          <View style={styles.createGroupIcon}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.createGroupText}>Criar Novo Grupo</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Seção: Meus Grupos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meus Grupos</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{myGroups.length}</Text>
            </View>
          </View>
          
          {/* Hint for swipe to delete */}
          {myGroups.length > 0 && (
            <Text style={styles.swipeHint}>
              <Ionicons name="arrow-back" size={12} color={COLORS.textSecondary} /> Deslize para a esquerda para excluir
            </Text>
          )}
          
          {myGroups.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="people-outline" size={32} color={COLORS.textSecondary} />
              <Text style={styles.emptySectionText}>Você ainda não criou nenhum grupo</Text>
            </View>
          ) : (
            myGroups.map(group => (
              <SwipeableGroupCard
                key={group.id}
                group={group}
                onPress={() => handleGroupPress(group)}
                onDelete={() => handleDeleteGroup(group)}
                canDelete={group.role === 'owner'}
              />
            ))
          )}
        </View>

        {/* Seção: Grupos que Participo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Grupos que Participo</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{participatingGroups.length}</Text>
            </View>
          </View>
          
          {participatingGroups.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="search-outline" size={32} color={COLORS.textSecondary} />
              <Text style={styles.emptySectionText}>Você ainda não participa de nenhum grupo</Text>
            </View>
          ) : (
            participatingGroups.map(group => (
              <SwipeableGroupCard
                key={group.id}
                group={group}
                onPress={() => handleGroupPress(group)}
                onDelete={() => {}}
                canDelete={false}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoLarge: {
    width: 180,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  deletingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
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
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  countBadge: {
    marginLeft: SPACING.sm,
    backgroundColor: 'rgba(163, 230, 53, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  swipeHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  emptySection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  swipeContainer: {
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    borderRadius: RADIUS.lg,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: DELETE_BUTTON_WIDTH,
    height: '100%',
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  groupCardAnimated: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
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
});

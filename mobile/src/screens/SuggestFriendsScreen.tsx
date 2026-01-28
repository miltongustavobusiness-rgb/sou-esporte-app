import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, SIZES, SHADOWS, RADIUS } from '../constants/theme';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { RootStackParamList } from '../types';
import LinkifiedText from '../components/LinkifiedText';

type SuggestFriendsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SuggestFriends'>;
  route: RouteProp<RootStackParamList, 'SuggestFriends'>;
};

interface SuggestedUser {
  id: number;
  name: string;
  photoUrl: string | null;
  gridBio: string | null;
  city: string | null;
  followersCount: number;
  isFollowing: boolean;
}

export default function SuggestFriendsScreen({ navigation, route }: SuggestFriendsScreenProps) {
  const { user } = useApp();
  const { showToast } = useToast();
  
  const userId = route?.params?.userId || user?.id;
  
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followedCount, setFollowedCount] = useState(0);
  const [followingUsers, setFollowingUsers] = useState<Set<number>>(new Set());
  
  // Load suggested users from backend
  const loadSuggestedUsers = useCallback(async () => {
    if (!userId) return;
    
    try {
      const result = await api.getSuggestedUsers({
        userId,
        limit: 20,
      });
      
      if (result.users) {
        setSuggestedUsers(result.users);
        // Track which users are already being followed
        const followingSet = new Set<number>();
        result.users.forEach((u: SuggestedUser) => {
          if (u.isFollowing) followingSet.add(u.id);
        });
        setFollowingUsers(followingSet);
      }
    } catch (error) {
      console.error('Error loading suggested users:', error);
      showToast('Erro ao carregar sugestões', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);
  
  useEffect(() => {
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);
  
  // Search users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const result = await api.searchAthletes({
        query: query.trim(),
        currentUserId: userId,
      });
      
      if (result.users) {
        // Filter out current user
        const filtered = result.users.filter((u: SuggestedUser) => u.id !== userId);
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [userId]);
  
  // Follow/unfollow user
  const handleToggleFollow = async (targetUserId: number) => {
    if (!userId) return;
    
    const isCurrentlyFollowing = followingUsers.has(targetUserId);
    
    // Optimistic update
    setFollowingUsers(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyFollowing) {
        newSet.delete(targetUserId);
        setFollowedCount(c => Math.max(0, c - 1));
      } else {
        newSet.add(targetUserId);
        setFollowedCount(c => c + 1);
      }
      return newSet;
    });
    
    try {
      if (isCurrentlyFollowing) {
        await api.unfollowUser({ userId, targetUserId });
      } else {
        await api.followUser({ userId, targetUserId });
      }
    } catch (error) {
      // Revert on error
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) {
          newSet.add(targetUserId);
          setFollowedCount(c => c + 1);
        } else {
          newSet.delete(targetUserId);
          setFollowedCount(c => Math.max(0, c - 1));
        }
        return newSet;
      });
      console.error('Error toggling follow:', error);
      showToast('Erro ao seguir usuário', 'error');
    }
  };
  
  // Navigate to user profile
  const handleViewProfile = (targetUserId: number, userName: string) => {
    navigation.navigate('UserGrid', { userId: targetUserId, userName });
  };
  
  // Continue to feed
  const handleContinue = () => {
    if (followedCount > 0) {
      showToast(`Você está seguindo ${followedCount} atleta${followedCount > 1 ? 's' : ''}!`, 'success');
    }
    navigation.replace('Feed');
  };
  
  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadSuggestedUsers();
  };
  
  // Render user card
  const renderUserCard = ({ item }: { item: SuggestedUser }) => {
    const isFollowing = followingUsers.has(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => handleViewProfile(item.id, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.photoUrl ? (
            <Image 
              source={{ uri: item.photoUrl }} 
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarInitials}>
                {item.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            {item.gridBio && (
              <LinkifiedText 
                text={item.gridBio}
                style={styles.userBio}
                numberOfLines={1}
              />
            )}
            <View style={styles.userMeta}>
              {item.city && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{item.city}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{item.followersCount} seguidores</Text>
              </View>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
          ]}
          onPress={() => handleToggleFollow(item.id)}
        >
          <Text style={[
            styles.followButtonText,
            isFollowing && styles.followingButtonText,
          ]}>
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  // Get display list (search results or suggestions)
  const displayList = searchQuery.trim().length >= 2 ? searchResults : suggestedUsers;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Encontre Atletas</Text>
          {followedCount > 0 && (
            <View style={styles.followedBadge}>
              <Text style={styles.followedBadgeText}>{followedCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          Siga atletas para ver suas atividades no seu feed
        </Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar atletas por nome..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* User List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando sugestões...</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery.trim().length >= 2 
                  ? 'Nenhum atleta encontrado'
                  : 'Nenhuma sugestão disponível'}
              </Text>
              {searchQuery.trim().length >= 2 && (
                <Text style={styles.emptySubtext}>
                  Tente buscar por outro nome
                </Text>
              )}
            </View>
          }
          ListHeaderComponent={
            isSearching ? (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.searchingText}>Buscando...</Text>
              </View>
            ) : searchQuery.trim().length < 2 && suggestedUsers.length > 0 ? (
              <Text style={styles.sectionTitle}>Sugestões para você</Text>
            ) : null
          }
        />
      )}
      
      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {followedCount > 0 ? 'Continuar para o Feed' : 'Pular por agora'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  followedBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  followedBadgeText: {
    fontSize: SIZES.xs,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  searchingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInitials: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  userBio: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingButtonText: {
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  continueButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.background,
  },
});
